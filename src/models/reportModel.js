const db = require('../config/db');
const {
  MAX_APPOINTMENTS_PER_DAY,
  BUSY_DAY_UTILIZATION_THRESHOLD,
} = require('../config/constants');

/**
 * Doctor statistics produced entirely in SQL:
 * net retained revenue, upcoming booked count, next-7-day daily counts,
 * and utilization % against the 12-slot daily cap.
 *
 * @param {number} doctorId
 * @returns {Promise<object|null>} null if doctor does not exist
 */
async function getDoctorStatistics(doctorId) {
  const [doctors] = await db.query(
    `SELECT id, name, specialty, consultation_fee, room
     FROM doctors
     WHERE id = ?`,
    [doctorId]
  );
  if (doctors.length === 0) {
    return null;
  }

  const [revenueRows] = await db.query(
    `
      SELECT COALESCE(SUM(
        CASE
          WHEN status = 'booked' THEN amount_paid
          WHEN status = 'cancelled' THEN amount_paid - IFNULL(refund_amount, 0)
          ELSE 0
        END
      ), 0) AS revenue
      FROM appointments
      WHERE doctor_id = ?
    `,
    [doctorId]
  );

  const [upcomingRows] = await db.query(
    `
      SELECT COUNT(*) AS upcoming_count
      FROM appointments
      WHERE doctor_id = ?
        AND status = 'booked'
        AND appt_datetime > NOW()
    `,
    [doctorId]
  );

  const [dailyRows] = await db.query(
    `
      WITH RECURSIVE days AS (
        SELECT CURDATE() AS day_date
        UNION ALL
        SELECT day_date + INTERVAL 1 DAY
        FROM days
        WHERE day_date < CURDATE() + INTERVAL 6 DAY
      )
      SELECT
        DATE_FORMAT(d.day_date, '%Y-%m-%d') AS date,
        COUNT(a.id) AS appointment_count,
        ROUND(COUNT(a.id) * 100.0 / ?, 2) AS utilization_percent
      FROM days d
      LEFT JOIN appointments a
        ON a.doctor_id = ?
        AND DATE(a.appt_datetime) = d.day_date
        AND a.status = 'booked'
      GROUP BY d.day_date
      ORDER BY d.day_date ASC
    `,
    [MAX_APPOINTMENTS_PER_DAY, doctorId]
  );

  const [utilRows] = await db.query(
    `
      WITH RECURSIVE days AS (
        SELECT CURDATE() AS day_date
        UNION ALL
        SELECT day_date + INTERVAL 1 DAY
        FROM days
        WHERE day_date < CURDATE() + INTERVAL 6 DAY
      )
      SELECT ROUND(
        (
          SELECT COUNT(*)
          FROM appointments a
          WHERE a.doctor_id = ?
            AND a.status = 'booked'
            AND DATE(a.appt_datetime) BETWEEN CURDATE() AND CURDATE() + INTERVAL 6 DAY
        ) * 100.0 / (? * 7),
        2
      ) AS overall_utilization_percent
    `,
    [doctorId, MAX_APPOINTMENTS_PER_DAY]
  );

  return {
    doctor: doctors[0],
    revenue: Number(revenueRows[0].revenue),
    upcomingCount: Number(upcomingRows[0].upcoming_count),
    appointmentsNext7Days: dailyRows.map((row) => ({
      date: row.date,
      appointmentCount: Number(row.appointment_count),
      utilizationPercent: Number(row.utilization_percent),
    })),
    overallUtilizationPercent: Number(utilRows[0].overall_utilization_percent),
    dailyCap: MAX_APPOINTMENTS_PER_DAY,
  };
}

/**
 * Every doctor's total appointments and net retained revenue,
 * including doctors with zero appointments (LEFT JOIN).
 *
 * @returns {Promise<object[]>}
 */
async function getDoctorsReport() {
  const [rows] = await db.query(
    `
      SELECT
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.specialty,
        COUNT(a.id) AS total_appointments,
        COALESCE(SUM(
          CASE
            WHEN a.status = 'booked' THEN a.amount_paid
            WHEN a.status = 'cancelled' THEN a.amount_paid - IFNULL(a.refund_amount, 0)
            ELSE 0
          END
        ), 0) AS revenue
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.name, d.specialty
      ORDER BY d.id ASC
    `
  );

  return rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    totalAppointments: Number(row.total_appointments),
    revenue: Number(row.revenue),
  }));
}

/**
 * Every (doctor, date) where booked appointments exceed 80% of the 12-slot cap.
 * Threshold: COUNT(*) > MAX_APPOINTMENTS_PER_DAY * BUSY_DAY_UTILIZATION_THRESHOLD
 *
 * @returns {Promise<object[]>}
 */
async function getBusyDaysReport() {
  const busyThreshold = MAX_APPOINTMENTS_PER_DAY * BUSY_DAY_UTILIZATION_THRESHOLD;

  const [rows] = await db.query(
    `
      SELECT
        a.doctor_id,
        d.name AS doctor_name,
        DATE_FORMAT(DATE(a.appt_datetime), '%Y-%m-%d') AS appointment_date,
        COUNT(*) AS booked_count,
        ROUND(COUNT(*) * 100.0 / ?, 2) AS utilization_percent
      FROM appointments a
      INNER JOIN doctors d ON d.id = a.doctor_id
      WHERE a.status = 'booked'
      GROUP BY a.doctor_id, d.name, DATE(a.appt_datetime)
      HAVING COUNT(*) > ?
      ORDER BY appointment_date ASC, a.doctor_id ASC
    `,
    [MAX_APPOINTMENTS_PER_DAY, busyThreshold]
  );

  return rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    appointmentDate: row.appointment_date,
    bookedCount: Number(row.booked_count),
    utilizationPercent: Number(row.utilization_percent),
    dailyCap: MAX_APPOINTMENTS_PER_DAY,
    busyThreshold,
  }));
}

module.exports = {
  getDoctorStatistics,
  getDoctorsReport,
  getBusyDaysReport,
};
