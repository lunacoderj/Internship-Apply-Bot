// src/routes/keys.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { createLogger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import { createKeySchema, deleteKeySchema } from '../validators/keys.js';
import { encryptKey, decryptKey } from '../lib/crypto.js';

const router = Router();
const logger = createLogger('keys');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── GET /keys ───────────────────────────────────────────────────
// Returns keys with hints only (never returns decrypted values)
router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_name, key_hint, is_active, created_at, updated_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json(data || []);
}));

// ── POST /keys ──────────────────────────────────────────────────
router.post('/', validate(createKeySchema), asyncHandler(async (req, res) => {
  const { key_name, key_value } = req.body;

  // Create a hint (first 4 + last 4 chars)
  const key_hint = key_value.length > 8
    ? `${key_value.slice(0, 4)}...${key_value.slice(-4)}`
    : '****';

  const encrypted_value = encryptKey(key_value);

  const { data, error } = await supabase
    .from('api_keys')
    .upsert({
      user_id: req.userId,
      key_name,
      encrypted_value,
      key_hint,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key_name' })
    .select('id, key_name, key_hint, is_active, created_at, updated_at')
    .single();

  if (error) throw error;

  logger.info(`API key "${key_name}" stored for user ${req.userId}`);
  res.status(201).json(data);
}));

// ── DELETE /keys/:id ────────────────────────────────────────────
router.delete('/:id', validate(deleteKeySchema, 'params'), asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select('id, key_name')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'API key not found' });
  }

  logger.info(`API key "${data.key_name}" deleted for user ${req.userId}`);
  res.json({ ok: true, deleted: data });
}));

// ── PUT /keys/:id/rotate ────────────────────────────────────────
// Re-encrypt an existing key (useful after rotating ENCRYPTION_SECRET)
router.put('/:id/rotate', validate(deleteKeySchema, 'params'), asyncHandler(async (req, res) => {
  // Fetch the current encrypted value
  const { data: existing, error: fetchErr } = await supabase
    .from('api_keys')
    .select('id, key_name, encrypted_value')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (fetchErr || !existing) {
    return res.status(404).json({ error: 'API key not found' });
  }

  // Decrypt with current secret, then re-encrypt
  const plainKey = decryptKey(existing.encrypted_value);
  const newEncrypted = encryptKey(plainKey);
  const key_hint = plainKey.length > 8
    ? `${plainKey.slice(0, 4)}...${plainKey.slice(-4)}`
    : '****';

  const { data, error } = await supabase
    .from('api_keys')
    .update({
      encrypted_value: newEncrypted,
      key_hint,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select('id, key_name, key_hint, is_active, updated_at')
    .single();

  if (error) throw error;

  logger.info(`API key "${existing.key_name}" rotated for user ${req.userId}`);
  res.json({ ok: true, rotated: data });
}));

export default router;
