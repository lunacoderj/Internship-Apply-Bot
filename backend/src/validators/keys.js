// src/validators/keys.js
import { z } from 'zod';

export const createKeySchema = z.object({
  key_name: z.string().min(1).max(100),
  key_value: z.string().min(1).max(500),
});

export const deleteKeySchema = z.object({
  id: z.string().uuid(),
});
