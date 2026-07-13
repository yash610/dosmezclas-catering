# Dos Mezclas Catering

A standalone catering site for **Dos Mezclas Restaurant and Bar** (Aubrey, TX) —
themed to match [dosmezclas.com](https://dosmezclas.com), built to later merge
into the main site as a `/catering` section.

Replaces the Google Forms + Zapier + Sheets + Square glue-together plan with a
real, self-contained web app: the pricing math, lead storage, and instant
quote all live in one place instead of being spread across four tools.

## What's automated out of the box (no external accounts needed)

- **Form intake** — multi-section catering request form (contact, event details, food selection, extras)
- **Pricing engine** — packages, add-ons, service type fees, tax (8.25% Aubrey TX), 18% service charge, optional promo-code discount, 30% deposit calculation — all computed server-side in `server/lib/pricing.js` so the numbers can never drift between preview and final quote
- **Instant quote** — shown on-screen immediately after submitting, with a print/"Save as PDF" button
- **Lead storage** — every submission is saved to a database (SQLite by default, Postgres-ready)
- **Admin dashboard** — password-protected `/admin/leads` page listing every request, its calculated quote, and a status pipeline (new → quoted → deposit pending → confirmed / cancelled)

## What still needs your real credentials (optional, plug-and-play)

- **Confirmation emails** — works the moment you fill in `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` in `server/.env` (Gmail app password, SendGrid, Mailgun, etc. all work). Leave blank and the site still works — it just skips sending the email.
- **Square deposit payment** — set `SQUARE_PAYMENT_LINK` in `server/.env` to a Square "Payment Link" (Square Dashboard → Online Checkout → Payment Links). The quote page will show a "Pay Deposit & Reserve Date" button linking to it. Leave blank and it shows a "Call to Secure Your Date" button instead.

## Stack

Same stack as your staff scheduler app for consistency:

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router — same theme tokens (charcoal/cream/clay + red/orange/yellow/green accents, Playfair Display + Inter)
- **Backend:** Node.js + Express + JWT auth (admin only — customers don't need accounts)
- **Database:** SQLite by default (zero config), PostgreSQL supported via `DB_CLIENT=pg`

## Project layout

```
catering-site/
├── server/
│   ├── server.js
│   ├── lib/pricing.js     # single source of truth for all quote math
│   ├── lib/mailer.js      # optional confirmation email (no-ops if SMTP unset)
│   ├── db/                # schema + sqlite/postgres adapter
│   ├── routes/quote.js    # public: /api/catering/options, /preview, /submit
│   └── routes/admin.js    # admin: /api/admin/login, /leads
└── client/
    └── src/
        ├── pages/Home.jsx          # landing page
        ├── pages/RequestQuote.jsx  # the catering request form + live pricing preview
        ├── pages/QuoteResult.jsx   # instant quote + deposit CTA
        ├── pages/AdminLogin.jsx
        └── pages/AdminLeads.jsx    # leads pipeline dashboard
```

## Quick start (local)

```bash
# 1. Backend
cd server
npm install
npm run seed          # creates catering.db + a default admin login (see output)
npm run dev           # http://localhost:4100

# 2. Frontend (new terminal)
cd client
npm install
npm run dev           # http://localhost:5180
```

Open **http://localhost:5180** for the customer-facing site, or
**http://localhost:5180/admin/login** for the leads dashboard (default login
printed by `npm run seed` — change `SEED_ADMIN_PASSWORD` in `server/.env`
before deploying).

## Adjusting prices

Everything lives in one file: `server/lib/pricing.js` — `PACKAGES`, `ADDONS`,
`SERVICE_TYPES`, `TAX_RATE`, `SERVICE_CHARGE_RATE`, `DEPOSIT_RATE`,
`PROMO_CODES`. Change a number there and both the live preview and the final
quote update automatically — nothing to keep in sync elsewhere.

## Deploying

Same pattern as the scheduler app:

- **Backend:** any Node host (Render, Railway, Fly, Vercel). Set `DB_CLIENT=pg` + `DATABASE_URL` for production, run `npm run migrate` then `npm start`.
- **Frontend:** `npm run build` → host `client/dist/` on Vercel/Netlify/Cloudflare Pages. Set `VITE_API_URL` to your backend's URL.
- Suggested subdomain for now: `catering.dosmezclas.com` (or any free path) pointing at this frontend.

## Merging into dosmezclas.com later

When you're ready to fold this into the main site instead of running it
standalone:
1. Move `client/src/pages/*` and `client/src/components/*` into the main
   site's React app as a `/catering` route (theme tokens already match, so
   no restyling needed).
2. Point the form's `VITE_API_URL` at wherever this backend ends up living
   (it can keep running as its own small service — no need to merge the
   backend, just the frontend routes).
3. Swap the standalone `TopNav`/`Footer` for the main site's shared layout.
