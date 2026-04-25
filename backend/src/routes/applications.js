// src/routes/applications.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { createLogger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import { applicationFilterSchema, markAppliedSchema } from '../validators/application.js';
import { applicationQueue } from '../queues/applicationQueue.js';

const router = Router();
const logger = createLogger('applications');

// ── asyncHandler helper ─────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /applications ───────────────────────────────────────────
// Filters: status, platform, pagination
router.get('/', validate(applicationFilterSchema, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, status, platform } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('applications')
    .select('*', { count: 'exact' })
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (platform) query = query.eq('platform', platform);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    applications: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}));

// ── GET /applications/stats ─────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const [statsRes, platformRes] = await Promise.all([
    supabase.from('application_stats').select('*').eq('user_id', req.userId).single(),
    supabase.from('platform_breakdown').select('*').eq('user_id', req.userId),
  ]);

  res.json({
    stats: statsRes.data || {
      total_applications: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    },
    platforms: platformRes.data || [],
  });
}));

// ── GET /applications/:id ───────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Application not found' });
  }

  res.json(data);
}));

// ── PATCH /applications/:id/mark-applied ────────────────────────
router.patch('/:id/mark-applied', validate(markAppliedSchema), asyncHandler(async (req, res) => {
  const updates = {
    status: 'success',
    applied_at: new Date().toISOString(),
    ...req.body,
  };

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Application not found' });
  }

  logger.info(`Application ${req.params.id} marked as applied`);
  res.json(data);
}));

// ── POST /applications/:id/retry ────────────────────────────────
router.post('/:id/retry', asyncHandler(async (req, res) => {
  const { data: app, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !app) {
    return res.status(404).json({ error: 'Application not found' });
  }

  if (app.status === 'processing') {
    return res.status(409).json({ error: 'Application is already being processed' });
  }

  // Reset status to pending
  await supabase
    .from('applications')
    .update({ status: 'pending', error_message: null, applypilot_output: null })
    .eq('id', app.id);

  // Re-enqueue
  await applicationQueue.add('apply', {
    applicationId: app.id,
    jobUrl: app.job_url,
    userId: app.user_id,
  }, {
    jobId: `retry-${app.id}-${Date.now()}`,
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
  });

  logger.info(`Application ${app.id} re-enqueued for retry`);
  res.json({ ok: true, message: 'Application re-enqueued' });
}));

// ── DELETE /applications/:id ────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('applications')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Application not found' });
  }

  logger.info(`Application ${req.params.id} deleted`);
  res.json({ ok: true, deleted: data });
}));

export default router;
