// src/workers/index.js
// Worker entry point — imports and starts BullMQ workers.
import { createLogger } from '../lib/logger.js';

const logger = createLogger('workers');

// Dynamically import to handle Redis not being available
try {
  await import('./applicationWorker.js');
  logger.info('All workers loaded');
} catch (err) {
  logger.warn(`Worker initialization skipped: ${err.message}`);
}
