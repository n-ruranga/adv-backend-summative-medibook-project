-- MediBook clinic appointment system
-- Run on a fresh MySQL server: mysql -u root -p < database/schema.sql
--
-- MySQL 8 quirks handled here:
-- 1) STORED generated column + FOREIGN KEY in the same CREATE fails
-- 2) CHECK constraints on the table can block later FOREIGN KEY ALTERs
-- 3) ON UPDATE CASCADE with the generated active_slot expression can fail FK creation
-- So: CREATE (with generated UNIQUE) -> ALTER FKs -> ALTER CHECKs

CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medibook;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS doctors;

CREATE TABLE patients (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doctors (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  consultation_fee DECIMAL(10, 2) NOT NULL,
  room VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_doctors_fee_nonnegative CHECK (consultation_fee >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointments (
  id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appt_datetime DATETIME NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2) NULL,
  status ENUM('booked', 'cancelled') NOT NULL DEFAULT 'booked',
  -- CAST/CONCAT only: MariaDB 10.4 (XAMPP) rejects DATE_FORMAT() in GENERATED columns
  active_slot VARCHAR(64)
    GENERATED ALWAYS AS (
      IF(
        status = 'booked',
        CONCAT(doctor_id, '|', CAST(appt_datetime AS CHAR(19))),
        NULL
      )
    ) STORED,
  booked_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_on DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_active_slot (active_slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id),
  ADD CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors (id);

ALTER TABLE appointments
  ADD CONSTRAINT chk_appointments_amount_nonnegative CHECK (amount_paid >= 0),
  ADD CONSTRAINT chk_appointments_refund_nonnegative CHECK (
    refund_amount IS NULL OR refund_amount >= 0
  );
