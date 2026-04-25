// src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes',
  },
});

// Strict rate limiter for auth-related actions
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Only 20 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

// Webhook rate limiter (more generous for inbound)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // 60 webhook calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many webhook requests.',
  },
});
