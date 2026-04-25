// src/routes/resume.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { createLogger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import { resumeUpsertSchema } from '../validators/resume.js';

const router = Router();
const logger = createLogger('resume');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /resume ─────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('resume_data')
    .select('*')
    .eq('user_id', req.userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

  res.json(data || null);
}));

// ── PUT /resume ─────────────────────────────────────────────────
router.put('/', validate(resumeUpsertSchema), asyncHandler(async (req, res) => {
  const payload = {
    ...req.validated,
    user_id: req.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('resume_data')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;

  logger.info(`Resume updated for user ${req.userId}`);
  res.json(data);
}));

export default router;
