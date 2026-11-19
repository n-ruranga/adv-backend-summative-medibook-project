# MediBook Schema Design Notes (3NF)

Normalized from the clinic spreadsheet into **exactly three entities**. Waitlist data lives in Redis (not a fourth table).

## Entities

### patients
| Column | MySQL type | Constraints |
|--------|------------|-------------|
| id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| phone | VARCHAR(30) | NOT NULL |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### doctors
| Column | MySQL type | Constraints |
|--------|------------|-------------|
| id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| specialty | VARCHAR(100) | NOT NULL |
| consultation_fee | DECIMAL(10,2) | NOT NULL, CHECK (>= 0) |
| room | VARCHAR(20) | NOT NULL |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### appointments
| Column | MySQL type | Constraints |
|--------|------------|-------------|
| id | INT | PK, AUTO_INCREMENT |
| patient_id | INT | NOT NULL, FK → patients(id) |
| doctor_id | INT | NOT NULL, FK → doctors(id) |
| appt_datetime | DATETIME | NOT NULL |
| amount_paid | DECIMAL(10,2) | NOT NULL, CHECK (>= 0) |
| refund_amount | DECIMAL(10,2) | NULL, CHECK (>= 0) |
| status | ENUM('booked','cancelled') | NOT NULL, DEFAULT 'booked' |
| active_slot | VARCHAR(64) | GENERATED, UNIQUE (NULL when cancelled) |
| booked_on | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| cancelled_on | DATETIME | NULL |

## Relationships & cardinality

- patients **1:N** appointments (one patient may have many appointments)
- doctors **1:N** appointments (one doctor may have many appointments)
- An appointment belongs to exactly one patient and one doctor

## Business-rule constraints (visible in schema)

1. **No double-booking a doctor slot:** `UNIQUE(active_slot)` where `active_slot` is generated as `CONCAT(doctor_id, '|', formatted appt_datetime)` only when `status = 'booked'`, otherwise `NULL`. MySQL allows multiple NULLs in a UNIQUE column, so cancelled rows keep refund history but free the slot for rebooking.
2. **Money types:** `DECIMAL(10,2)` for fees, amounts paid, and refunds.
3. **Non-negative money:** CHECK constraints on `consultation_fee`, `amount_paid`, and `refund_amount`.
4. **Patient email uniqueness:** `UNIQUE(email)`.
5. **Daily cap (12) and working-hours/30-minute rules:** enforced in application transactions (not only DDL), with the unique slot constraint backing concurrency safety.

## Why this is 3NF

- Patient contact details are stored once in `patients` (no repeating groups from the spreadsheet).
- Doctor specialty, fee, and room live once in `doctors`.
- `appointments` holds only booking facts and keys into the other two tables — no transitive dependency of specialty/fee on the appointment row.
