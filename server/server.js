require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { migrate } = require('./db/schema');
const quoteRoutes = require('./routes/quote');
const adminRoutes = require('./routes/admin');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true; // allow all in dev

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Dos Mezclas Catering' }));

app.use('/api/catering', quoteRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Memoised migration — Vercel cold-starts run it once per instance
let migrated = false;
async function ensureMigrated() {
  if (!migrated) {
    await migrate();
    migrated = true;
  }
}

const PORT = process.env.PORT || 4100;

if (require.main === module) {
  // Local dev — start the HTTP server directly
  (async () => {
    try {
      await ensureMigrated();
      app.listen(PORT, () => {
        console.log(`Dos Mezclas Catering API listening on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start:', err);
      process.exit(1);
    }
  })();
} else {
  // Vercel serverless — export an async handler that migrates on first request
  module.exports = async (req, res) => {
    await ensureMigrated();
    app(req, res);
  };
}
