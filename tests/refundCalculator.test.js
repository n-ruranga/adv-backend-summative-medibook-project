const { calculateRefund } = require('../src/services/refundCalculator');

/** Fixed appointment instant used across refund tests. */
const APPT = new Date('2026-08-10T10:00:00.000Z');

function hoursBefore(appt, hours) {
  return new Date(appt.getTime() - hours * 60 * 60 * 1000);
}

describe('calculateRefund', () => {
  test('more than 48 hours notice returns 100% refund', () => {
    const cancelledAt = hoursBefore(APPT, 72);
    const result = calculateRefund(APPT, 150, cancelledAt);

    expect(result.tier).toBe('full');
    expect(result.refundRate).toBe(1);
    expect(result.refundAmount).toBe(150);
    expect(result.noticeHours).toBe(72);
  });
});
