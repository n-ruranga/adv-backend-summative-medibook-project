const {
  REFUND_FULL_HOURS,
  REFUND_PARTIAL_HOURS,
  REFUND_FULL_RATE,
  REFUND_PARTIAL_RATE,
  REFUND_NONE_RATE,
} = require('../config/constants');

/**
 * Refund policy (notice hours before appointment):
 * - more than 48 hours → 100%
 * - 24–48 hours inclusive (exact 24h and exact 48h) → 50%
 * - less than 24 hours → 0%
 *
 * @param {Date|string} apptDatetime
 * @param {number} amountPaid
 * @param {Date|string} [cancelledAt=new Date()]
 * @returns {{
 *   noticeHours: number,
 *   refundRate: number,
 *   refundAmount: number,
 *   tier: 'full'|'partial'|'none'
 * }}
 */
function calculateRefund(apptDatetime, amountPaid, cancelledAt = new Date()) {
  const appt = apptDatetime instanceof Date ? apptDatetime : new Date(apptDatetime);
  const cancelled =
    cancelledAt instanceof Date ? cancelledAt : new Date(cancelledAt);

  if (Number.isNaN(appt.getTime())) {
    throw new Error('apptDatetime must be a valid date');
  }
  if (Number.isNaN(cancelled.getTime())) {
    throw new Error('cancelledAt must be a valid date');
  }

  const amount = Number(amountPaid);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('amountPaid must be a non-negative number');
  }

  const noticeHours = (appt.getTime() - cancelled.getTime()) / (1000 * 60 * 60);

  let refundRate;
  let tier;

  if (noticeHours > REFUND_FULL_HOURS) {
    refundRate = REFUND_FULL_RATE;
    tier = 'full';
  } else if (noticeHours >= REFUND_PARTIAL_HOURS) {
    // Includes exact 24h and exact 48h boundaries → 50%
    refundRate = REFUND_PARTIAL_RATE;
    tier = 'partial';
  } else {
    refundRate = REFUND_NONE_RATE;
    tier = 'none';
  }

  const refundAmount = Math.round(amount * refundRate * 100) / 100;

  return {
    noticeHours,
    refundRate,
    refundAmount,
    tier,
  };
}

module.exports = {
  calculateRefund,
};
