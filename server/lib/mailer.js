// Confirmation + internal notification emails. If SMTP env vars aren't set,
// both quietly no-op so the quote flow still works without any email
// account configured. Fill in server/.env (see .env.example) to turn this
// on — no Zapier required.

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

// Shared line-item table used by both the customer confirmation and the
// internal owner notification, so the numbers always look identical.
function renderQuoteTable(quote) {
  if (quote.requiresManualQuote) {
    return `<p style="margin:0 0 12px;">${quote.message}</p>`;
  }

  const rows = [];
  for (const p of quote.packages) {
    rows.push([`${p.label} × ${quote.guestCount} guests`, money(p.total)]);
  }
  for (const a of quote.addons) {
    rows.push([a.label, money(a.total)]);
  }
  rows.push([quote.serviceType.label, money(quote.serviceType.total)]);
  if (quote.breakdown.discountAmount > 0) {
    rows.push([quote.breakdown.discountLabel, `-${money(quote.breakdown.discountAmount)}`]);
  }
  rows.push([`Service Charge (${(quote.breakdown.serviceChargeRate * 100).toFixed(0)}%)`, money(quote.breakdown.serviceCharge)]);
  rows.push([`Tax (${(quote.breakdown.taxRate * 100).toFixed(2)}%)`, money(quote.breakdown.tax)]);

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:4px 0;color:#f5ead8cc;">${label}</td>
      <td style="padding:4px 0;text-align:right;">${value}</td>
    </tr>
  `).join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rowsHtml}
      <tr><td colspan="2" style="border-top:1px solid #f5ead833;padding-top:8px;"></td></tr>
      <tr>
        <td style="padding:4px 0;font-weight:bold;">Total</td>
        <td style="padding:4px 0;text-align:right;font-weight:bold;">${money(quote.breakdown.total)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#e67e22;font-weight:bold;">30% Deposit Due</td>
        <td style="padding:4px 0;text-align:right;color:#e67e22;font-weight:bold;">${money(quote.breakdown.depositDue)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#f5ead8cc;">Remaining Balance</td>
        <td style="padding:4px 0;text-align:right;color:#f5ead8cc;">${money(quote.breakdown.balanceDue)}</td>
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

  const html = `
    <div style="font-family:Georgia,serif;background:#1a1614;color:#f5ead8;padding:32px;border-radius:12px;">
      <h1 style="color:#f5ead8;margin:0 0 4px;">Dos Mezclas Catering</h1>
      <p style="color:#f5ead8cc;margin:0 0 20px;">Savor the Fusion</p>
      <p>Hi ${name || 'there'},</p>
      <p>Thank you for reaching out to Dos Mezclas Catering! We've received your request. Here's your instant estimate:</p>
      ${renderQuoteTable(quote)}
      <p style="margin-top:20px;">This is an estimate — we'll follow up if anything needs adjusting before your deposit. If your event is urgent, call us directly at 469-688-9450.</p>
      <p>We look forward to serving you!<br/>— Dos Mezclas</p>
    </div>
  `;

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

  const html = `
    <div style="font-family:Georgia,serif;background:#1a1614;color:#f5ead8;padding:32px;border-radius:12px;">
      <h1 style="color:#f5ead8;margin:0 0 4px;">New Catering Lead</h1>
      <p style="color:#f5ead8cc;margin:0 0 20px;">Submitted just now via the catering site</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Name</td><td style="text-align:right;">${lead.fullName}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Phone</td><td style="text-align:right;">${lead.phone}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Email</td><td style="text-align:right;">${lead.email}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Event</td><td style="text-align:right;">${lead.eventType || '—'} — ${lead.eventDate} at ${lead.eventTime}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Guests</td><td style="text-align:right;">${lead.guestCount}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Service</td><td style="text-align:right;">${lead.serviceType.replace('_', ' ')}</td></tr>
        <tr><td style="color:#f5ead8cc;padding:2px 0;">Location</td><td style="text-align:right;">${lead.eventLocation}</td></tr>
        ${lead.budget ? `<tr><td style="color:#f5ead8cc;padding:2px 0;">Budget</td><td style="text-align:right;">${lead.budget}</td></tr>` : ''}
      </table>
      ${renderQuoteTable(quote)}
      ${lead.specialInstructions ? `<p style="margin-top:16px;font-style:italic;color:#f5ead8cc;">"${lead.specialInstructions}"</p>` : ''}
      <p style="margin-top:20px;"><a href="${process.env.ADMIN_URL || '#'}" style="color:#e67e22;">Open the admin dashboard →</a></p>
    </div>
  `;

  await t.sendMail({
    from,
    to: notifyTo,
    subject: `New Catering Lead — ${lead.fullName} (${lead.guestCount} guests, ${lead.eventDate})`,
    html,
  });
  return { sent: true };
}

module.exports = { sendCateringConfirmation, sendOwnerNotification };
