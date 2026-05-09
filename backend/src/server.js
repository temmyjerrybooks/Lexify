require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

// Start Bull workers (registers job processors; must run before any jobs are queued)
require('./workers/ai.worker');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security ──────────────────────────────────────────────
app.use(helmet());

// FIX [S1]: Throw at startup when ALLOWED_ORIGINS is absent in production so
// the server never silently falls back to wildcard CORS with credentials enabled.
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS must be set in production. Refusing to start with wildcard CORS.');
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8081'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ─── Performance ───────────────────────────────────────────
app.use(compression());

// ─── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  }));
}

// ─── Rate Limiting ─────────────────────────────────────────
app.use('/api/', createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
}));

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'examify-api',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// ─── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ─── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Examify API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Graceful shutdown — close DB connections before exiting
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
