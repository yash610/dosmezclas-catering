# Deploying Dos Mezclas Catering to Vercel

Two separate Vercel projects: one for the **API** (`server/`) and one for the **frontend** (`client/`) — same pattern as the staff scheduler app, so you can reuse the same Neon Postgres account if you'd like (or spin up a second free database).

---

## 1. Set up PostgreSQL (Neon — free tier)

SQLite is fine for local dev, but Vercel's serverless functions don't have persistent disk, so production needs Postgres.

1. Go to [neon.tech](https://neon.tech) (or reuse your existing account from the scheduler app).
2. Create a new project → name it `dosmezclas-catering`.
3. Copy the **connection string**:
   ```
   postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/dosmezclas-catering?sslmode=require
   ```

---

## 2. Deploy the API (`server/`)

1. Push this repo to GitHub if it isn't already.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo → set **Root Directory** to `catering-site/server`.
3. Set **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `DB_CLIENT` | `pg` |
   | `DATABASE_URL` | *(your Neon connection string)* |
   | `JWT_SECRET` | *(run `openssl rand -hex 32`)* |
   | `SEED_ADMIN_EMAIL` | the email you'll log into `/admin/leads` with |
   | `SEED_ADMIN_PASSWORD` | a real password (not the default) |
   | `CORS_ORIGIN` | leave blank for now, fill in after step 3 |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | *(optional — see below)* |
   | `SQUARE_PAYMENT_LINK` | *(optional — see below)* |

4. **Deploy.** Copy the resulting URL (e.g. `https://dosmezclas-catering-api.vercel.app`).
5. Run the migration + admin seed against the **production** database from your machine:
   ```bash
   cd catering-site/server
   DB_CLIENT=pg DATABASE_URL="<neon connection string>" npm run migrate
   DB_CLIENT=pg DATABASE_URL="<neon connection string>" SEED_ADMIN_EMAIL=you@dosmezclas.com SEED_ADMIN_PASSWORD=your-real-password npm run seed
   ```
6. Back in Vercel project settings, set `CORS_ORIGIN` to your frontend URL (from step 3) → **Redeploy**.

---

## 3. Deploy the frontend (`client/`)

1. [vercel.com](https://vercel.com) → **Add New Project** → import the same repo → set **Root Directory** to `catering-site/client`.
2. Framework preset: **Vite** (auto-detected).
3. Set **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | your API URL from step 2 |

4. **Deploy.** Your catering site is live.

---

## 4. Optional — turn on emails (customer confirmation + owner notification)

Fill in on the **API** project (Vercel → Settings → Environment Variables), then redeploy:

- Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<16-char App Password, not your normal password>`
- SendGrid / Mailgun: use their SMTP relay credentials instead
- `NOTIFY_EMAIL=manager@dosmezclas.com` — where the internal "new lead" email goes every time someone submits the form. Defaults to `SMTP_USER` if left blank.
- `ADMIN_URL=https://<your-frontend-url>/admin/login` — optional, adds a direct link into the owner notification email.

Once set, every submission sends two emails: a confirmation to the customer with their quote breakdown, and a notification to `NOTIFY_EMAIL` with the customer's contact info, event details, and the same breakdown. Leave all blank and the site keeps working — it just skips sending both.

## 5. Optional — turn on the Square deposit button

1. Square Dashboard → **Online Checkout → Payment Links** → create a link (e.g. "Catering Deposit").
2. Copy the link URL into `SQUARE_PAYMENT_LINK` on the **API** project → redeploy.

Until this is set, the quote page shows a "Call to Secure Your Date" button instead.

---

## 6. First-time checks once live

1. Open the frontend URL → fill out **Request a Quote** with a test event → confirm the instant quote math looks right.
2. Go to `/admin/login` → sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in step 2.
3. Confirm your test lead shows up in `/admin/leads` with the right total and deposit due.
4. If you filled in SMTP, confirm the test email arrived.

---

## Local development

```bash
cd catering-site/server
cp .env.example .env        # defaults to sqlite, no changes needed locally
npm install
npm run seed                # creates catering.db + prints a default admin login
npm run dev                 # http://localhost:4100

cd catering-site/client      # new terminal
cp .env.example .env
npm install
npm run dev                 # http://localhost:5180
```

## Changing the admin password

`npm run seed` only ever *creates* the admin account the first time — running it again against a database that already has that email does nothing (by design, so redeploying never silently resets your password). To actually change it, run this from `catering-site/server` on your own machine, pointed at whichever database is live:

```bash
DB_CLIENT=pg DATABASE_URL="<your Neon connection string>" \
  ADMIN_EMAIL=manager@dosmezclas.com NEW_ADMIN_PASSWORD="your-new-password" \
  npm run passwd
```

If `ADMIN_EMAIL` doesn't have an account yet, this creates one instead of erroring — so it also works as a way to add a second manager login. No redeploy needed; it updates the database directly and takes effect on your next login.

---

## Environment variable reference

### `server/`
| Variable | Required | Description |
|----------|----------|-------------|
| `DB_CLIENT` | Yes | `pg` for production, `sqlite` for local |
| `DATABASE_URL` | Yes (pg) | Neon/Postgres connection string |
| `JWT_SECRET` | Yes | Long random string — signs admin auth tokens |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Yes | Your `/admin/leads` login, set before running `npm run seed` |
| `CORS_ORIGIN` | Yes (prod) | Frontend URL |
| `SMTP_*` | No | Customer confirmation + owner notification emails — both skipped if blank |
| `NOTIFY_EMAIL` | No | Who receives the internal "new lead" email on every submission. Defaults to `SMTP_USER` if blank |
| `ADMIN_URL` | No | Link to `/admin/leads` included in the owner notification email |
| `SQUARE_PAYMENT_LINK` | No | Deposit payment button — falls back to a phone-call CTA if blank |
| `PORT` | No | Defaults to 4100 |

### `client/`
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | API base URL, no trailing slash |
