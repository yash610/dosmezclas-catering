// Confirmation + internal notification emails. If SMTP env vars aren't set,
// both quietly no-op so the quote flow still works without any email
// account configured. Fill in server/.env (see .env.example) to turn this
// on — no Zapier required.
//
// Email HTML uses a light cream background with dark text (not the site's
// dark charcoal theme). Dark-background emails are unreliable across real
// inboxes — many webmail clients (Hostinger/Titan, Outlook, Gmail dark mode)
// auto-invert or override colors and end up rendering text that's invisible
// or barely legible. A light background with explicit dark text on every
// cell is the safe, universally-readable choice for transactional email.

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

// Palette — kept light-on-dark-text so every email client renders it the
// same way, instead of the site's dark theme (see note above).
const INK = '#3a2a1f';       // primary text (matches site's "clay")
const INK_SOFT = '#6b5a4d';  // secondary/label text
const CREAM = '#faf3e6';     // card background
const RED = '#c0392b';
const ORANGE = '#b5651d';    // darkened from the site's accent-orange for AA contrast on cream
const GREEN = '#1f7a44';     // darkened from accent-green for contrast on cream

// Shared line-item table used by both the customer confirmation and the
// internal owner notification, so the numbers always look identical.
// Every cell sets its own color explicitly — never relies on inheriting
// color from a parent element, since several email clients don't honor that.
function renderQuoteTable(quote) {
  if (quote.requiresManualQuote) {
    return `<p style="margin:0 0 12px;color:${INK};">${quote.message}</p>`;
  }

  const rows = [];
  for (const p of quote.packages) {
    rows.push([`${p.label} × ${quote.guestCount} guests`, money(p.total)]);
  }
  for (const a of quote.addons) {
    rows.push([a.label, money(a.total)]);
  }
  if (quote.breakdown.discountAmount > 0) {
    rows.push([quote.breakdown.discountLabel, `-${money(quote.breakdown.discountAmount)}`, GREEN]);
  }
  if (quote.breakdown.serviceChargeRate > 0) {
    rows.push([`Service Charge (${(quote.breakdown.serviceChargeRate * 100).toFixed(0)}%)`, money(quote.breakdown.serviceCharge)]);
  }
  rows.push([`Tax (${(quote.breakdown.taxRate * 100).toFixed(2)}%)`, money(quote.breakdown.tax)]);

  const rowsHtml = rows.map(([label, value, color]) => `
    <tr>
      <td style="padding:5px 0;color:${color || INK};font-size:14px;">${label}</td>
      <td style="padding:5px 0;text-align:right;color:${color || INK};font-size:14px;">${value}</td>
    </tr>
  `).join('');

  const radiusWarning = quote.withinDeliveryRadius === false
    ? `<p style="margin:12px 0 0;color:${RED};font-size:13px;">⚠ Outside the 10-mile delivery radius — confirm the additional delivery fee before quoting a final total.</p>`
    : '';

  return `
    <p style="margin:0 0 8px;color:${INK_SOFT};font-size:14px;">Service: <strong style="color:${INK};">${quote.serviceType.label}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${rowsHtml}
      <tr><td colspan="2" style="border-top:1px solid #3a2a1f33;padding-top:8px;"></td></tr>
      <tr>
        <td style="padding:5px 0;font-weight:bold;color:${INK};font-size:15px;">Total</td>
        <td style="padding:5px 0;text-align:right;font-weight:bold;color:${INK};font-size:15px;">${money(quote.breakdown.total)}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-weight:bold;color:${ORANGE};font-size:14px;">30% Deposit Due</td>
        <td style="padding:5px 0;text-align:right;font-weight:bold;color:${ORANGE};font-size:14px;">${money(quote.breakdown.depositDue)}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:${INK_SOFT};font-size:14px;">Remaining Balance</td>
        <td style="padding:5px 0;text-align:right;color:${INK_SOFT};font-size:14px;">${money(quote.breakdown.balanceDue)}</td>
      </tr>
    </table>
    ${radiusWarning}
  `;
}

// Wraps body content in a light card on a neutral page background — the
// outer <table bgcolor> is old-school on purpose, since some webmail clients
// (including Hostinger/Titan's) strip <style> blocks and only honor inline
// attributes reliably.
function wrapEmail(bodyHtml) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#efe6d6" style="background:#efe6d6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${CREAM}" style="background:${CREAM};max-width:600px;width:100%;border-radius:12px;">
            <tr>
              <td style="padding:32px;font-family:Georgia,'Times New Roman',serif;color:${INK};">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// Sent to the customer right after they submit the form.
async function sendCateringConfirmation({ to, name, quote }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — skipping confirmation email to ${to}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const from = process.env.SMTP_FROM || `"Dos Mezclas Catering" <${process.env.SMTP_USER}>`;

  const html = wrapEmail(`
    <h1 style="color:${INK};margin:0 0 4px;font-size:24px;">Dos Mezclas Catering</h1>
    <p style="color:${INK_SOFT};margin:0 0 20px;font-size:14px;">Savor the Fusion</p>
    <p style="color:${INK};font-size:15px;">Hi ${name || 'there'},</p>
    <p style="color:${INK};font-size:15px;">Thank you for reaching out to Dos Mezclas Catering! We've received your request. Here's your instant estimate:</p>
    ${renderQuoteTable(quote)}
    <p style="margin-top:20px;color:${INK};font-size:14px;">This is an estimate — we'll follow up if anything needs adjusting before your deposit. If your event is urgent, call us directly at 469-688-9450.</p>
    <p style="color:${INK};font-size:14px;">We look forward to serving you!<br/>— Dos Mezclas</p>
  `);

  await t.sendMail({
    from,
    to,
    subject: 'Your Catering Request Received – Dos Mezclas',
    html,
  });
  return { sent: true };
}

// Sent to the restaurant (owner/manager) every time a new lead comes in, so
// nothing has to be checked manually in the admin dashboard.
async function sendOwnerNotification({ lead, quote }) {
  const t = getTransporter();
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!t || !notifyTo) {
    console.log('[mailer] SMTP or NOTIFY_EMAIL not configured — skipping owner notification');
    return { sent: false, reason: !t ? 'smtp_not_configured' : 'notify_email_not_configured' };
  }

  const from = process.env.SMTP_FROM || `"Dos Mezclas Catering" <${process.env.SMTP_USER}>`;

  // Only render the dashboard link if a real URL is configured — a bare "#"
  // looks clickable but goes nowhere, which is worse than omitting it.
  const adminUrl = process.env.ADMIN_URL;
  const adminLinkHtml = adminUrl
    ? `<p style="margin-top:20px;"><a href="${adminUrl}" target="_blank" rel="noopener noreferrer" style="color:${ORANGE};font-weight:bold;">Open the admin dashboard →</a></p>`
    : '';

  const html = wrapEmail(`
    <h1 style="color:${INK};margin:0 0 4px;font-size:24px;">New Catering Lead</h1>
    <p style="color:${INK_SOFT};margin:0 0 20px;font-size:14px;">Submitted just now via the catering site</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Name</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.fullName}</td></tr>
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Phone</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.phone}</td></tr>
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Email</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.email}</td></tr>
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Event</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.eventType || '—'} — ${lead.eventDate} at ${lead.eventTime}</td></tr>
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Guests</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.guestCount}</td></tr>
      <tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Location</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.eventLocation}</td></tr>
      ${lead.budget ? `<tr><td style="color:${INK_SOFT};padding:3px 0;font-size:14px;">Budget</td><td style="text-align:right;color:${INK};font-size:14px;">${lead.budget}</td></tr>` : ''}
    </table>
    ${renderQuoteTable(quote)}
    ${lead.specialInstructions ? `<p style="margin-top:16px;font-style:italic;color:${INK_SOFT};font-size:14px;">"${lead.specialInstructions}"</p>` : ''}
    ${adminLinkHtml}
  `);

  await t.sendMail({
    from,
    to: notifyTo,
    subject: `New Catering Lead — ${lead.fullName} (${lead.guestCount} guests, ${lead.eventDate})`,
    html,
  });
  return { sent: true };
}

module.exports = { sendCateringConfirmation, sendOwnerNotification };
