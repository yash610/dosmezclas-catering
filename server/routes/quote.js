const express = require('express');
const db = require('../db');
const { PACKAGES, ADDONS, SERVICE_TYPES, COMPLIMENTARY_NOTE, calculateQuote } = require('../lib/pricing');
const { sendCateringConfirmation, sendOwnerNotification } = require('../lib/mailer');

const router = express.Router();

// Menu/pricing options for the form to render — client never hardcodes prices.
router.get('/options', (_req, res) => {
  res.json({ packages: PACKAGES, addons: ADDONS, serviceTypes: SERVICE_TYPES, complimentaryNote: COMPLIMENTARY_NOTE });
});

// Live pricing preview — no lead is saved. Used as the user fills the form.
router.post('/preview', (req, res) => {
  const quote = calculateQuote(req.body || {});
  if (!quote.ok) return res.status(400).json({ error: quote.errors.join('; ') });
  res.json(quote);
});

// Full submission — saves the lead, computes the authoritative quote, and
// (optionally) emails the customer + the restaurant if SMTP is configured.
router.post('/submit', async (req, res) => {
  const {
    fullName, phone, email,
    eventType, eventDate, eventTime, guestCount, serviceType, eventLocation,
    packages = [], addons = [], budget, specialInstructions, promoCode,
    withinDeliveryRadius = true,
  } = req.body || {};

  if (!fullName || !phone || !email) {
    return res.status(400).json({ error: 'Full name, phone, and email are required' });
  }
  if (!eventDate || !eventTime) {
    return res.status(400).json({ error: 'Event date and time are required' });
  }
  if (!eventLocation) {
    return res.status(400).json({ error: 'Event location is required' });
  }

  const quote = calculateQuote({ packages, addons, serviceType, guestCount, promoCode, withinDeliveryRadius });
  if (!quote.ok) return res.status(400).json({ error: quote.errors.join('; ') });

  // `package` column stores a JSON array so guests can mix multiple menus —
  // same convention as the `addons` column.
  const result = await db.run(
    `INSERT INTO catering_leads
      (full_name, phone, email, event_type, event_date, event_time, guest_count,
       service_type, event_location, package, addons, budget, special_instructions,
       promo_code, pricing_json, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'new')`,
    [
      fullName, phone, email, eventType || null, eventDate, eventTime, Number(guestCount),
      serviceType, eventLocation, JSON.stringify(packages), JSON.stringify(addons), budget || null,
      specialInstructions || null, promoCode || null, JSON.stringify(quote),
    ],
  );

  // Customer confirmation and owner notification are independent — one
  // failing (or SMTP being unconfigured) never blocks the other or the
  // lead from being saved.
  let customerEmail = { sent: false, reason: 'not_attempted' };
  try {
    customerEmail = await sendCateringConfirmation({ to: email, name: fullName, quote });
  } catch (err) {
    console.error('[mailer] failed to send customer confirmation:', err.message);
    customerEmail = { sent: false, reason: 'error' };
  }

  let ownerEmail = { sent: false, reason: 'not_attempted' };
  try {
    ownerEmail = await sendOwnerNotification({
      lead: {
        fullName, phone, email, eventType, eventDate, eventTime,
        guestCount: Number(guestCount), serviceType, eventLocation,
        budget, specialInstructions,
      },
      quote,
    });
  } catch (err) {
    console.error('[mailer] failed to send owner notification:', err.message);
    ownerEmail = { sent: false, reason: 'error' };
  }

  res.status(201).json({
    leadId: result.lastID,
    quote,
    email: { customer: customerEmail, owner: ownerEmail },
    squarePaymentLink: quote.requiresManualQuote ? null : (process.env.SQUARE_PAYMENT_LINK || null),
  });
});

module.exports = router;
