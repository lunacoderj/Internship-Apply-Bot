// src/lib/logger.js
// Simple structured logger wrapping console with level support

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'debug'] ?? LOG_LEVELS.debug;

export const createLogger = (namespace) => {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args) => {
      if (currentLevel <= LOG_LEVELS.debug) console.debug(prefix, ...args);
    },
    info: (...args) => {
      if (currentLevel <= LOG_LEVELS.info) console.info(prefix, ...args);
    },
    warn: (...args) => {
      if (currentLevel <= LOG_LEVELS.warn) console.warn(prefix, ...args);
    },
    error: (...args) => {
      if (currentLevel <= LOG_LEVELS.error) console.error(prefix, ...args);
    },
  };
};
