const util = require('util');

const LEVELS = ['debug', 'info', 'warn', 'error'];
const DEFAULT_LEVEL = process.env.LOG_LEVEL || 'debug';

function timestamp() {
  return new Date().toISOString();
}

function shouldLog(level) {
  const configured = LEVELS.indexOf(DEFAULT_LEVEL);
  const current = LEVELS.indexOf(level);
  return current >= configured;
}

function formatMessage(level, msg, meta) {
  let out = `[${timestamp()}] [${level.toUpperCase()}] ${msg}`;
  if (meta !== undefined) {
    try {
      // Use util.inspect to preserve circular structures and make objects readable
      const inspected = typeof meta === 'string' ? meta : util.inspect(meta, { depth: 3 });
      out += ` | ${inspected}`;
    } catch (e) {
      out += ` | (meta serialization failed)`;
    }
  }
  return out;
}

function debug(msg, meta) {
  if (!shouldLog('debug')) return;
  console.debug(formatMessage('debug', msg, meta));
}

function info(msg, meta) {
  if (!shouldLog('info')) return;
  console.info(formatMessage('info', msg, meta));
}

function warn(msg, meta) {
  if (!shouldLog('warn')) return;
  console.warn(formatMessage('warn', msg, meta));
}

function error(msg, meta) {
  if (!shouldLog('error')) return;
  console.error(formatMessage('error', msg, meta));
}

module.exports = { debug, info, warn, error };
