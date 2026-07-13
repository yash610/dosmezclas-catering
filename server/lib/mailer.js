// Optional confirmation email. If SMTP env vars aren't set, this quietly
// no-ops so the quote flow still works without any email account configured.
// Fill in server/.env (see .env.example) to turn it on — no Zapier required.

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

async function sendCateringConfirmation({ to, name, quote }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — skipping confirmation email to ${to}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const from = process.env.SMTP_FROM || `"Dos Mezclas Catering" <${process.env.SMTP_USER}>`;
  const total = quote?.breakdown?.total;

  const html = `
    <div style="font-family:Georgia,serif;background:#1a1614;color:#f5ead8;padding:32px;">
      <h1 style="color:#f5ead8;">Dos Mezclas Catering</h1>
      <p style="color:#f5ead8cc;">Savor the Fusion</p>
      <p>Hi ${name || 'there'},</p>
      <p>Thank you for reaching out to Dos Mezclas Catering! We've received your request and here's your estimated quote:</p>
      ${total !== undefined ? `<p style="font-size:20px;font-weight:bold;">Estimated Total: $${total.toFixed(2)}</p>` : '<p>We will follow up with custom pricing within 24 hours.</p>'}
      <p>If your event is urgent, call us directly at 469-688-9450.</p>
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

module.exports = { sendCateringConfirmation };
