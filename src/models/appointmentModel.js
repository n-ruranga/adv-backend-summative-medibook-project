const db = require('../config/db');

/**
 * Format a Date as MySQL DATETIME (YYYY-MM-DD HH:MM:SS) in local time.
 * @param {Date} date
 * @returns {string}
 */
function toMySqlDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * @param {Date|string} date
 * @returns {string} YYYY-MM-DD
 */
function toMySqlDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function findById(id) {
  const sql = `
    SELECT
      id,
      patient_id,
      doctor_id,
      appt_datetime,
      amount_paid,
      refund_amount,
      status,
      active_slot,
      booked_on,
      cancelled_on
    FROM appointments
    WHERE id = ?
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

/**
 * Count booked appointments for a doctor on a calendar day.
 * @param {number} doctorId
 * @param {Date|string} day
 * @returns {Promise<number>}
 */
async function countBookedForDoctorOnDate(doctorId, day) {
  const sql = `
    SELECT COUNT(*) AS booked_count
    FROM appointments
    WHERE doctor_id = ?
      AND DATE(appt_datetime) = ?
      AND status = 'booked'
  `;
  const [rows] = await db.query(sql, [doctorId, toMySqlDate(day)]);
  return Number(rows[0].booked_count);
}

module.exports = {
  findById,
  countBookedForDoctorOnDate,
  toMySqlDateTime,
  toMySqlDate,
};
