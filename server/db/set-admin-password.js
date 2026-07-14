// Changes (or creates) an admin login's password directly against whichever
// database DB_CLIENT/DATABASE_URL point at. Use this against production —
// re-running `npm run seed` will NOT change an existing admin's password,
// it only creates the account the first time.
//
// Usage:
//   ADMIN_EMAIL=manager@dosmezclas.com NEW_ADMIN_PASSWORD="new-password" npm run passwd
//
// Against production Postgres:
//   DB_CLIENT=pg DATABASE_URL="<neon connection string>" \
//   ADMIN_EMAIL=manager@dosmezclas.com NEW_ADMIN_PASSWORD="new-password" npm run passwd

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');
const { migrate } = require('./schema');

async function run() {
  await migrate();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.NEW_ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME; // only used if creating a new account

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and NEW_ADMIN_PASSWORD env vars before running this script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('NEW_ADMIN_PASSWORD should be at least 8 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const existing = await db.get(`SELECT id FROM admin_users WHERE email = $1`, [email]);

  if (existing) {
    await db.run(`UPDATE admin_users SET password_hash = $1 WHERE email = $2`, [hash, email]);
    console.log(`Password updated for ${email}.`);
  } else {
    await db.run(
      `INSERT INTO admin_users (email, password_hash, full_name) VALUES ($1, $2, $3)`,
      [email, hash, fullName || 'Dos Mezclas Manager'],
    );
    console.log(`No existing account for ${email} — created a new one with the given password.`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to set admin password:', err);
  process.exit(1);
});
