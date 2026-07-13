require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');
const { migrate } = require('./schema');

async function seed() {
  await migrate();

  const email = process.env.SEED_ADMIN_EMAIL || 'manager@dosmezclas.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'catering123';
  const fullName = process.env.SEED_ADMIN_NAME || 'Dos Mezclas Manager';

  const existing = await db.get(`SELECT id FROM admin_users WHERE email = $1`, [email]);
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await db.run(
      `INSERT INTO admin_users (email, password_hash, full_name) VALUES ($1, $2, $3)`,
      [email, hash, fullName],
    );
    console.log(`Seeded admin user: ${email} / ${password}`);
    console.log('Change this password in production via SEED_ADMIN_PASSWORD before re-seeding.');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
