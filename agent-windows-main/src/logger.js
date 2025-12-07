/*
  Winston-based logger with console + rotating file transport.
  - File rotation by size with maxFiles retention.
  - Logs directory is configurable via LOG_DIR env or defaults per-OS.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createLogger, format, transports } = require('winston');

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

const DEFAULT_DATA_DIR = process.env.DATA_DIR || (
  process.platform === 'win32'
    ? path.join(process.env.PROGRAMDATA || 'C://ProgramData', 'WeighingAgent')
    : path.join(os.homedir(), '.weighing-agent')
);
const LOG_DIR = process.env.LOG_DIR || path.join(DEFAULT_DATA_DIR, 'logs');
ensureDir(LOG_DIR);

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${message}${rest}`;
    })
  ),
  transports: [
    new transports.Console({}),
    new transports.File({
      filename: path.join(LOG_DIR, 'agent.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

module.exports = {
  logger,
  LOG_DIR,
  DEFAULT_DATA_DIR,
};

