/**
 * Central business-rule constants for MediBook.
 * Keep magic numbers here — do not scatter them through controllers/models.
 */

const MAX_APPOINTMENTS_PER_DAY = 12;

/** Working day window (inclusive start, exclusive end for last start). */
const WORKING_HOURS_START = '09:00';
const WORKING_HOURS_END = '17:00';

/** Appointment length / slot alignment in minutes. */
const SLOT_DURATION_MINUTES = 30;

/**
 * Last bookable slot start is 16:30 so a 30-minute visit finishes by 17:00.
 */
const LAST_SLOT_START = '16:30';

/** Refund tiers by notice hours before appointment. */
const REFUND_FULL_HOURS = 48; // more than 48h → 100%
const REFUND_PARTIAL_HOURS = 24; // 24–48h inclusive → 50%; below 24h → 0%
const REFUND_FULL_RATE = 1.0;
const REFUND_PARTIAL_RATE = 0.5;
const REFUND_NONE_RATE = 0;

/** Busy-days report: more than 80% of daily capacity. */
const BUSY_DAY_UTILIZATION_THRESHOLD = 0.8;

module.exports = {
  MAX_APPOINTMENTS_PER_DAY,
  WORKING_HOURS_START,
  WORKING_HOURS_END,
  SLOT_DURATION_MINUTES,
  LAST_SLOT_START,
  REFUND_FULL_HOURS,
  REFUND_PARTIAL_HOURS,
  REFUND_FULL_RATE,
  REFUND_PARTIAL_RATE,
  REFUND_NONE_RATE,
  BUSY_DAY_UTILIZATION_THRESHOLD,
};
