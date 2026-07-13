// Schema written to work on both SQLite and PostgreSQL.
const db = require('./index');

const isPg = db.client === 'pg';

const pkAuto = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
const now = isPg ? 'CURRENT_TIMESTAMP' : "(datetime('now'))";

const statements = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id ${pkAuto},
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP DEFAULT ${now}
  )`,

  `CREATE TABLE IF NOT EXISTS catering_leads (
    id ${pkAuto},
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    event_type TEXT,
    event_date TEXT,
    event_time TEXT,
    guest_count INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    event_location TEXT,
    package TEXT NOT NULL,
    addons TEXT,
    budget TEXT,
    special_instructions TEXT,
    promo_code TEXT,
    pricing_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT ${now}
  )`,

  `CREATE INDEX IF NOT EXISTS idx_leads_status ON catering_leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_created ON catering_leads(created_at)`,
];

async function migrate() {
  for (const sql of statements) {
    await db.exec(sql);
  }
}

module.exports = { migrate };
