const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = await db.get(`SELECT * FROM admin_users WHERE email = $1`, [email]);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ id: admin.id, email: admin.email, role: 'admin' });
  res.json({ token, user: { id: admin.id, email: admin.email, fullName: admin.full_name } });
});

router.get('/me', authRequired, async (req, res) => {
  const admin = await db.get(`SELECT id, email, full_name FROM admin_users WHERE id = $1`, [req.user.id]);
  if (!admin) return res.status(404).json({ error: 'Not found' });
  res.json(admin);
});

router.get('/leads', authRequired, async (req, res) => {
  const status = req.query.status;
  const rows = status
    ? await db.query(`SELECT * FROM catering_leads WHERE status = $1 ORDER BY created_at DESC`, [status])
    : await db.query(`SELECT * FROM catering_leads ORDER BY created_at DESC`);

  const leads = rows.map((r) => ({
    ...r,
    addons: safeParse(r.addons, []),
    pricing: safeParse(r.pricing_json, null),
  }));
  res.json(leads);
});

router.get('/leads/:id', authRequired, async (req, res) => {
  const row = await db.get(`SELECT * FROM catering_leads WHERE id = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, addons: safeParse(row.addons, []), pricing: safeParse(row.pricing_json, null) });
});

router.patch('/leads/:id/status', authRequired, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['new', 'quoted', 'deposit_pending', 'confirmed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

  await db.run(`UPDATE catering_leads SET status = $1 WHERE id = $2`, [status, req.params.id]);
  const row = await db.get(`SELECT * FROM catering_leads WHERE id = $1`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, addons: safeParse(row.addons, []), pricing: safeParse(row.pricing_json, null) });
});

function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
