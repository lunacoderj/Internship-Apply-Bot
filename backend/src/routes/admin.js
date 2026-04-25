// src/routes/admin.js
// Bull Board UI + admin queue stats
import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { applicationQueue } from '../queues/applicationQueue.js';
import { createLogger } from '../lib/logger.js';

const router = Router();
const logger = createLogger('admin');

// ── Basic admin auth (password-based for simplicity) ────────────
const adminAuth = (req, res, next) => {
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey) {
    // No admin secret set — allow in dev, block in prod
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Admin access disabled — set ADMIN_SECRET' });
    }
    return next();
  }

  const provided =
    req.headers['x-admin-key'] ||
    req.query.key ||
    req.headers.authorization?.replace('Bearer ', '');

  if (provided !== adminKey) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  next();
};

// ── Bull Board UI ───────────────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(applicationQueue)],
  serverAdapter,
});

router.use('/queues', adminAuth, serverAdapter.getRouter());

// ── Queue stats JSON endpoint ───────────────────────────────────
router.get('/queues/stats', adminAuth, async (req, res) => {
  try {
    const counts = await applicationQueue.getJobCounts();
    res.json({
      queue: 'applications',
      counts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Failed to get queue stats: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

export default router;
