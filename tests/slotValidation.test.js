const { validateAppointmentSlot } = require('../src/services/slotValidation');

/** Fixed "now": 2026-08-01 08:00 local */
const NOW = new Date(2026, 7, 1, 8, 0, 0, 0);

describe('validateAppointmentSlot', () => {
  test('accepts a future 30-minute aligned slot within working hours', () => {
    const slot = new Date(2026, 7, 10, 9, 0, 0, 0);
    const result = validateAppointmentSlot(slot, NOW);

    expect(result.valid).toBe(true);
    expect(result.date).toEqual(slot);
  });

  test('rejects 09:15 because it is not on a 30-minute boundary (edge)', () => {
    const slot = new Date(2026, 7, 10, 9, 15, 0, 0);
    const result = validateAppointmentSlot(slot, NOW);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/30-minute slot boundary/i);
  });

  test('rejects 17:00 as a start time (last allowed start is 16:30) (edge)', () => {
    const slot = new Date(2026, 7, 10, 17, 0, 0, 0);
    const result = validateAppointmentSlot(slot, NOW);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/16:30/i);
  });

  test('rejects a malformed date string (edge)', () => {
    const result = validateAppointmentSlot('not-a-real-datetime', NOW);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/valid date\/time/i);
  });
});
