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

  test('notice between 24 and 48 hours returns 50% refund', () => {
    const cancelledAt = hoursBefore(APPT, 36);
    const result = calculateRefund(APPT, 150, cancelledAt);

    expect(result.tier).toBe('partial');
    expect(result.refundRate).toBe(0.5);
    expect(result.refundAmount).toBe(75);
    expect(result.noticeHours).toBe(36);
  });

  test('less than 24 hours notice returns 0% refund', () => {
    const cancelledAt = hoursBefore(APPT, 12);
    const result = calculateRefund(APPT, 150, cancelledAt);

    expect(result.tier).toBe('none');
    expect(result.refundRate).toBe(0);
    expect(result.refundAmount).toBe(0);
    expect(result.noticeHours).toBe(12);
  });
});
