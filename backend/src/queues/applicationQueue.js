// src/queues/applicationQueue.js
import { Queue } from 'bullmq';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('queue');

// Parse Redis connection from REDIS_URL or use defaults
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        ...(url.protocol === 'rediss:' && { tls: {} }), // TLS for rediss:// URIs
      };
    } catch (e) {
      logger.warn(`Failed to parse REDIS_URL, using defaults: ${e.message}`);
    }
  }
  return { host: '127.0.0.1', port: 6379 };
};

const connection = getRedisConnection();

export const applicationQueue = new Queue('applications', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },   // Keep last 200 completed
    removeOnFail: { count: 500 },       // Keep last 500 failed
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
  },
});

// Event listeners
applicationQueue.on('error', (err) => {
  // Don't crash on Redis connection errors — just log
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ENOTFOUND')) {
    logger.warn('Redis not available — queue operations will fail until Redis is connected');
  } else {
    logger.error(`Queue error: ${err.message}`);
  }
});

logger.info('Application queue initialized');

export default applicationQueue;
