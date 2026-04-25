import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { validate } from '../middleware/validate.js';
import { getEmailLogsSchema, getEmailLogByIdSchema } from '../validators/emailLog.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /email-logs ─────────────────────────────────────────────
router.get('/', validate(getEmailLogsSchema, 'query'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', req.userId)
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  res.json({
    emailLogs: data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}));

// ── GET /email-logs/:id ─────────────────────────────────────────
router.get('/:id', validate(getEmailLogByIdSchema, 'params'), asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Email log not found' });
  }

  res.json(data);
}));

export default router;
