const express = require('express');
const db = require('../db');
const { PACKAGES, ADDONS, SERVICE_TYPES, calculateQuote } = require('../lib/pricing');
const { sendCateringConfirmation } = require('../lib/mailer');

const router = express.Router();

// Menu/pricing options for the form to render — client never hardcodes prices.
router.get('/options', (_req, res) => {
  res.json({ packages: PACKAGES, addons: ADDONS, serviceTypes: SERVICE_TYPES });
});

// Live pricing preview — no lead is saved. Used as the user fills the form.
router.post('/preview', (req, res) => {
  const quote = calculateQuote(req.body || {});
  if (!quote.ok) return res.status(400).json({ error: quote.errors.join('; ') });
  res.json(quote);
});

// Full submission — saves the lead, computes the authoritative quote, and
// (optionally) emails a confirmation if SMTP is configured.
router.post('/submit', async (req, res) => {
  const {
    fullName, phone, email,
    eventType, eventDate, eventTime, guestCount, serviceType, eventLocation,
    package: pkgKey, addons = [], budget, specialInstructions, promoCode,
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

  const quote = calculateQuote({ package: pkgKey, addons, serviceType, guestCount, promoCode });
  if (!quote.ok) return res.status(400).json({ error: quote.errors.join('; ') });

  const result = await db.run(
    `INSERT INTO catering_leads
      (full_name, phone, email, event_type, event_date, event_time, guest_count,
       service_type, event_location, package, addons, budget, special_instructions,
       promo_code, pricing_json, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'new')`,
    [
      fullName, phone, email, eventType || null, eventDate, eventTime, Number(guestCount),
      serviceType, eventLocation, pkgKey, JSON.stringify(addons), budget || null,
      specialInstructions || null, promoCode || null, JSON.stringify(quote),
    ],
  );

  let emailResult = { sent: false, reason: 'not_attempted' };
  try {
    emailResult = await sendCateringConfirmation({ to: email, name: fullName, quote });
  } catch (err) {
    console.error('[mailer] failed to send confirmation:', err.message);
    emailResult = { sent: false, reason: 'error' };
  }

  res.status(201).json({
    leadId: result.lastID,
    quote,
    email: emailResult,
    squarePaymentLink: quote.requiresManualQuote ? null : (process.env.SQUARE_PAYMENT_LINK || null),
  });
});

module.exports = router;
