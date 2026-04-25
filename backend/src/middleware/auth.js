// src/middleware/auth.js
import { supabase } from '../lib/supabase.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('auth');

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('User not found');

    req.user = data.user;
    req.userId = data.user.id;
    next();
  } catch (err) {
    logger.warn(`Auth failed: ${err.message}`);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
