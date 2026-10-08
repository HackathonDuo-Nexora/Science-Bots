/**
 * server.js — Science Bots Backend
 *
 * Entry point. Configures Express, CORS, middleware, routes, and starts the server.
 */

import 'dotenv/config';
import express  from 'express';
import cors     from 'cors';
import researchRoutes from './routes/researchRoutes.js';

const app  = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      FRONTEND_URL,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'science-bots-backend',
    status:  'healthy',
  });
});

// ─── Research routes ──────────────────────────────────────────────────────────
app.use('/api/research', researchRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler — never expose stack traces ─────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Science Bots Backend running on http://localhost:${PORT}`);
  console.log(`   CORS origin : ${FRONTEND_URL}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
});
