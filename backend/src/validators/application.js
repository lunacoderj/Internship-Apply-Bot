// src/validators/application.js
import { z } from 'zod';

export const applicationFilterSchema = z.object({
  status: z.enum(['pending', 'processing', 'success', 'failed', 'skipped', 'archived']).optional(),
  platform: z.enum(['LinkedIn', 'Indeed', 'Glassdoor', 'ZipRecruiter', 'Workday', 'Direct', 'Google Jobs', 'Unknown']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const markAppliedSchema = z.object({
  job_title: z.string().optional(),
  company_name: z.string().optional(),
});

export const retrySchema = z.object({
  force: z.boolean().optional().default(false),
});
