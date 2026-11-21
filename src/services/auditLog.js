const fs = require('fs').promises;
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG_PATH = path.join(LOGS_DIR, 'audit.log');

let ensureDirPromise = null;

/**
 * Ensure logs/ exists (async). Cached so we only mkdir once per process.
 * Never throws to callers of appendAudit — failures are swallowed there.
 */
async function ensureLogsDir() {
  if (!ensureDirPromise) {
    ensureDirPromise = fs.mkdir(LOGS_DIR, { recursive: true }).catch((err) => {
      ensureDirPromise = null;
      throw err;
    });
  }
  return ensureDirPromise;
}

/**
 * Append one JSON line to logs/audit.log using async fs only.
 * Logging failures are swallowed so they never fail the caller's request.
 *
 * @param {string} eventType - e.g. 'booking' | 'cancellation'
 * @param {object} payload
 */
async function appendAudit(eventType, payload = {}) {
  try {
    await ensureLogsDir();
    const entry = {
      timestamp: new Date().toISOString(),
      event: eventType,
      ...payload,
    };
    await fs.appendFile(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = {
  appendAudit,
  AUDIT_LOG_PATH,
  LOGS_DIR,
};
