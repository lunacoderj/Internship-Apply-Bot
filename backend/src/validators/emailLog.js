import { z } from 'zod';

export const getEmailLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getEmailLogByIdSchema = z.object({
  id: z.string().uuid(),
});
