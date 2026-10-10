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
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://effortless-duckanoo-f35f47.netlify.app',
]);

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) allowedOrigins.add(clean);
  });
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (health checks, server-to-server, curl)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.has(cleanOrigin) ||
      cleanOrigin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
  console.log(`   CORS origins: ${[...allowedOrigins].join(', ')} (+ *.netlify.app)`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
});
