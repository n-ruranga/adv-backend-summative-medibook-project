const {
  WORKING_HOURS_START,
  LAST_SLOT_START,
  SLOT_DURATION_MINUTES,
} = require('../config/constants');

/**
 * Parse an appointment datetime input into a Date.
 * Accepts Date instances or parseable strings (e.g. ISO / MySQL DATETIME).
 * @param {string|Date} value
 * @returns {Date|null}
 */
function parseAppointmentDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const normalized = value.trim().includes('T')
    ? value.trim()
    : value.trim().replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Local wall-clock HH:mm for a Date (uses local timezone).
 * @param {Date} date
 * @returns {string}
 */
function formatTimeHm(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Validate a proposed appointment slot.
 * Rules: future-only, within working hours, 30-minute boundary,
 * last start 16:30 (visit ends by 17:00).
 *
 * @param {string|Date} apptDatetime
 * @param {Date} [now=new Date()]
 * @returns {{ valid: boolean, error?: string, date?: Date }}
 */
function validateAppointmentSlot(apptDatetime, now = new Date()) {
  const date = parseAppointmentDate(apptDatetime);
  if (!date) {
    return { valid: false, error: 'appt_datetime must be a valid date/time' };
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return { valid: false, error: 'reference time (now) is invalid' };
  }

  if (date.getTime() <= now.getTime()) {
    return { valid: false, error: 'Appointments can only be booked in the future' };
  }

  if (date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
    return {
      valid: false,
      error: 'appt_datetime must fall on a whole minute with zero seconds',
    };
  }

  if (date.getMinutes() % SLOT_DURATION_MINUTES !== 0) {
    return {
      valid: false,
      error: `appt_datetime must align to a ${SLOT_DURATION_MINUTES}-minute slot boundary`,
    };
  }

  const timeHm = formatTimeHm(date);
  const minutes = timeToMinutes(timeHm);
  const startMinutes = timeToMinutes(WORKING_HOURS_START);
  const lastStartMinutes = timeToMinutes(LAST_SLOT_START);

  if (minutes < startMinutes || minutes > lastStartMinutes) {
    return {
      valid: false,
      error: `appt_datetime must be between ${WORKING_HOURS_START} and ${LAST_SLOT_START} inclusive`,
    };
  }

  return { valid: true, date };
}

module.exports = {
  parseAppointmentDate,
  validateAppointmentSlot,
};
