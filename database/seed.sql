-- MediBook sample data
-- Requires schema.sql to have been applied first.
-- Includes: 4 patients, 3 doctors (one with zero appointments),
-- and 14 appointments with Dr. Boateng at the 12-slot daily cap on 2026-08-10.

USE medibook;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE appointments;
TRUNCATE TABLE patients;
TRUNCATE TABLE doctors;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO patients (id, name, email, phone, created_at) VALUES
  (1, 'Ama Mensah', 'ama@mail.com', '0244-111-222', '2026-06-01 10:00:00'),
  (2, 'Kojo Owusu', 'kojo@mail.com', '0555-333-444', '2026-06-02 11:00:00'),
  (3, 'Efua Asante', 'efua@mail.com', '0202-555-666', '2026-06-03 12:00:00'),
  (4, 'Yaw Boateng', 'yaw@mail.com', '0277-777-888', '2026-06-04 13:00:00');

INSERT INTO doctors (id, name, specialty, consultation_fee, room, created_at) VALUES
  (1, 'Dr. Boateng', 'Dermatology', 150.00, 'R-12', '2026-05-01 09:00:00'),
  (2, 'Dr. Adjei', 'Paediatrics', 100.00, 'R-03', '2026-05-02 09:00:00'),
  (3, 'Dr. Sarpong', 'General Practice', 80.00, 'R-07', '2026-05-03 09:00:00');
-- Dr. Sarpong (id=3) intentionally has zero appointments.

-- 12 booked appointments for Dr. Boateng on 2026-08-10 (daily cap = 12)
INSERT INTO appointments
  (patient_id, doctor_id, appt_datetime, amount_paid, refund_amount, status, booked_on, cancelled_on)
VALUES
  (1, 1, '2026-08-10 09:00:00', 150.00, NULL, 'booked', '2026-07-01 09:00:00', NULL),
  (2, 1, '2026-08-10 09:30:00', 150.00, NULL, 'booked', '2026-07-02 10:00:00', NULL),
  (3, 1, '2026-08-10 10:00:00', 150.00, NULL, 'booked', '2026-07-03 11:00:00', NULL),
  (4, 1, '2026-08-10 10:30:00', 150.00, NULL, 'booked', '2026-07-04 12:00:00', NULL),
  (1, 1, '2026-08-10 11:00:00', 150.00, NULL, 'booked', '2026-07-05 09:00:00', NULL),
  (2, 1, '2026-08-10 11:30:00', 150.00, NULL, 'booked', '2026-07-06 10:00:00', NULL),
  (3, 1, '2026-08-10 12:00:00', 150.00, NULL, 'booked', '2026-07-07 11:00:00', NULL),
  (4, 1, '2026-08-10 12:30:00', 150.00, NULL, 'booked', '2026-07-08 12:00:00', NULL),
  (1, 1, '2026-08-10 13:00:00', 150.00, NULL, 'booked', '2026-07-09 09:00:00', NULL),
  (2, 1, '2026-08-10 13:30:00', 150.00, NULL, 'booked', '2026-07-10 10:00:00', NULL),
  (3, 1, '2026-08-10 14:00:00', 150.00, NULL, 'booked', '2026-07-11 11:00:00', NULL),
  (4, 1, '2026-08-10 14:30:00', 150.00, NULL, 'booked', '2026-07-12 12:00:00', NULL),
  -- Additional appointments for Dr. Adjei (variety for reports)
  (1, 2, '2026-08-15 10:00:00', 100.00, NULL, 'booked', '2026-07-03 14:00:00', NULL),
  (2, 2, '2026-08-15 10:30:00', 100.00, NULL, 'booked', '2026-07-04 15:00:00', NULL);
