// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createLogger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import { apiLimiter, webhookLimiter } from './middleware/rateLimiter.js';
import webhookRouter from './routes/webhook.js';
import apiRouter from './routes/api.js';
import adminRouter from './routes/admin.js';

config();
const app = express();
const logger = createLogger('server');
const isProd = process.env.NODE_ENV === 'production';

// ────────────────────────────────────────────
// Security middleware
// ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", process.env.SUPABASE_URL || '', process.env.FRONTEND_URL || ''],
          },
        }
      : false, // Disable CSP in dev for hot-reload
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    crossOriginEmbedderPolicy: false, // Allow Bull Board
  })
);

// CORS – restrict to specific origins in production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: isProd
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) cb(null, true);
          else cb(new Error('CORS: origin not allowed'));
        }
      : true, // Allow all in dev
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
  })
);

// Structured request logging
app.use(
  morgan(isProd ? 'combined' : 'dev', {
    stream: { write: (m) => logger.info(m.trim()) },
  })
);

// Parse JSON except for webhook (which needs raw body for signature verification)
app.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) return next();
  express.json({ limit: '10mb' })(req, res, next);
});

// ────────────────────────────────────────────
// Public routes
// ────────────────────────────────────────────
app.use('/webhook', webhookLimiter, webhookRouter);

// ────────────────────────────────────────────
// Health check (expanded)
// ────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const checks = { server: 'ok', timestamp: new Date().toISOString() };

  // Supabase connectivity
  try {
    const { default: supabaseLib } = await import('./lib/supabase.js');
    const { data, error } = await supabaseLib.from('applications').select('id').limit(1);
    checks.supabase = error ? `error: ${error.message}` : 'ok';
  } catch (e) {
    checks.supabase = `error: ${e.message}`;
  }

  // Redis / queue depth
  try {
    const { applicationQueue } = await import('./queues/applicationQueue.js');
    const counts = await applicationQueue.getJobCounts();
    checks.redis = 'ok';
    checks.queueDepth = counts;
  } catch (e) {
    checks.redis = `error: ${e.message}`;
  }

  const allOk = checks.supabase === 'ok' && checks.redis === 'ok';
  res.status(allOk ? 200 : 503).json(checks);
});

// ────────────────────────────────────────────
// Admin routes (Bull Board, queue stats)
// ────────────────────────────────────────────
app.use('/admin', adminRouter);

// ────────────────────────────────────────────
// Protected API routes
// ────────────────────────────────────────────
app.use('/api', apiLimiter, requireAuth, apiRouter);

// ────────────────────────────────────────────
// Error handling (must be last)
// ────────────────────────────────────────────
app.use(errorHandler);

// ────────────────────────────────────────────
// Start server & workers
// ────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000');
app.listen(port, async () => {
  logger.info(`🚀 Server running on port ${port} (${process.env.NODE_ENV || 'development'})`);

  // Start workers (non-blocking — won't crash if Redis is down)
  try {
    await import('./workers/index.js');
  } catch (err) {
    logger.warn(`Workers not started: ${err.message}`);
  }
});

export default app;
