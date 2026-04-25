// src/validators/resume.js
import { z } from 'zod';

export const resumeUpsertSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  portfolio_url: z.string().url().optional().or(z.literal('')),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })).optional(),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  resume_text: z.string().max(50000).optional(),
});
