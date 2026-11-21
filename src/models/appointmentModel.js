const db = require('../config/db');
const { MAX_APPOINTMENTS_PER_DAY } = require('../config/constants');
const { calculateRefund } = require('../services/refundCalculator');

function createBookingError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

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

/**
 * Book an appointment inside a transaction.
 * Locks the doctor row to serialize daily-cap checks; UNIQUE(active_slot)
 * prevents two patients holding the same doctor datetime.
 *
 * @param {{ patientId: number, doctorId: number, apptDatetime: Date }} input
 * @returns {Promise<object>} created appointment row
 */
async function createBooking({ patientId, doctorId, apptDatetime }) {
  const connection = await db.getConnection();
  const apptSql = toMySqlDateTime(apptDatetime);
  const daySql = toMySqlDate(apptDatetime);

  try {
    await connection.beginTransaction();

    const [patients] = await connection.query(
      'SELECT id FROM patients WHERE id = ?',
      [patientId]
    );
    if (patients.length === 0) {
      throw createBookingError('PATIENT_NOT_FOUND', `Patient with id ${patientId} not found`);
    }

    const [doctors] = await connection.query(
      'SELECT id, consultation_fee FROM doctors WHERE id = ? FOR UPDATE',
      [doctorId]
    );
    if (doctors.length === 0) {
      throw createBookingError('DOCTOR_NOT_FOUND', `Doctor with id ${doctorId} not found`);
    }

    const amountPaid = Number(doctors[0].consultation_fee);

    // Lock existing booked rows for this doctor-day (gap safety via doctor FOR UPDATE above).
    await connection.query(
      `
        SELECT id
        FROM appointments
        WHERE doctor_id = ?
          AND DATE(appt_datetime) = ?
          AND status = 'booked'
        FOR UPDATE
      `,
      [doctorId, daySql]
    );

    const [countRows] = await connection.query(
      `
        SELECT COUNT(*) AS booked_count
        FROM appointments
        WHERE doctor_id = ?
          AND DATE(appt_datetime) = ?
          AND status = 'booked'
      `,
      [doctorId, daySql]
    );
    const bookedCount = Number(countRows[0].booked_count);

    if (bookedCount >= MAX_APPOINTMENTS_PER_DAY) {
      throw createBookingError(
        'DAY_FULL',
        `Doctor already has ${MAX_APPOINTMENTS_PER_DAY} appointments on ${daySql}`
      );
    }

    let insertResult;
    try {
      const [result] = await connection.query(
        `
          INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid, status)
          VALUES (?, ?, ?, ?, 'booked')
        `,
        [patientId, doctorId, apptSql, amountPaid]
      );
      insertResult = result;
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw createBookingError(
          'SLOT_TAKEN',
          'This doctor already has an appointment at the requested date/time'
        );
      }
      throw err;
    }

    const [rows] = await connection.query(
      `
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
      `,
      [insertResult.insertId]
    );

    await connection.commit();
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Cancel an appointment and record its refund in one transaction.
 * Setting status to 'cancelled' clears generated active_slot (NULL), freeing the slot.
 *
 * @param {number} appointmentId
 * @param {Date} [cancelledAt=new Date()]
 * @returns {Promise<{ appointment: object, refund: object }>}
 */
async function cancelAppointment(appointmentId, cancelledAt = new Date()) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
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
        FOR UPDATE
      `,
      [appointmentId]
    );

    if (rows.length === 0) {
      throw createBookingError(
        'APPOINTMENT_NOT_FOUND',
        `Appointment with id ${appointmentId} not found`
      );
    }

    const existing = rows[0];
    if (existing.status === 'cancelled') {
      throw createBookingError(
        'ALREADY_CANCELLED',
        `Appointment with id ${appointmentId} is already cancelled`
      );
    }

    const refund = calculateRefund(
      existing.appt_datetime,
      existing.amount_paid,
      cancelledAt
    );
    const cancelledSql = toMySqlDateTime(cancelledAt);

    await connection.query(
      `
        UPDATE appointments
        SET status = 'cancelled',
            refund_amount = ?,
            cancelled_on = ?
        WHERE id = ?
      `,
      [refund.refundAmount, cancelledSql, appointmentId]
    );

    const [updatedRows] = await connection.query(
      `
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
      `,
      [appointmentId]
    );

    await connection.commit();
    return {
      appointment: updatedRows[0],
      refund,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  findById,
  countBookedForDoctorOnDate,
  createBooking,
  cancelAppointment,
  toMySqlDateTime,
  toMySqlDate,
};
