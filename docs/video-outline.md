# MediBook Video Walkthrough Outline (max 10 minutes)

Speak in your own words. Show the running app (API + worker + Postman/Thunder Client). Aim for clear audio and screen.

## 1. Intro (~30s)
- Project: MediBook clinic appointment backend (Express, MySQL, Redis)
- Stack choices: no ORM, parameterized SQL in models only, separate worker process

## 2. Database design (~1.5 min)
- Open `schema-diagram.svg` and `docs/schema-notes.md`
- Three entities only: patients, doctors, appointments
- Highlight: `UNIQUE(active_slot)` so a doctor cannot hold two appointments at the same datetime
- Explain cancelled rows keep refund history while `active_slot` becomes NULL (slot rebookable)
- Briefly show `database/schema.sql` + seed cases (zero-appointment doctor, near-cap day)

## 3. Project structure (~45s)
- `src/models` → SQL only  
- `src/controllers` → business rules  
- `src/routes` → REST mapping  
- `src/services` → refund, slot validation, audit, Redis queues  
- `src/worker.js` → background jobs

## 4. Live demo — CRUD (~1 min)
- Create/list patient and doctor
- Show 400 validation and 404 for unknown id

## 5. Live demo — booking rules (~2 min)
- Book a valid future 30-minute slot → 201
- Reject past / 09:15 / 17:00 start
- Show daily cap / slot conflict → 409 + waitlist offer
- Join waitlist: `POST /api/waitlist`
- Explain concurrency: transaction + `FOR UPDATE` + unique `active_slot`

## 6. Live demo — cancel + refund (~1.5 min)
- Cancel with >48h notice → 100% refund
- Mention exact 24h / 48h boundaries → 50% (show unit tests if short on live data)
- Show cancelled row kept; slot can be rebooked
- Show `logs/audit.log` lines for booking and cancellation

## 7. Live demo — worker + waitlist promotion (~1.5 min)
- Ensure `npm run worker` is running
- Cancel a booked slot that has a waitlisted patient
- Show worker promoting the patient and writing confirmation/promotion to audit log
- Explain re-queue on failed promotion

## 8. Live demo — reports (~1 min)
- `GET /api/doctors/:id/statistics`
- `GET /api/reports/doctors` (include zero-appointment doctor)
- `GET /api/reports/busy-days` (>80% of 12)

## 9. Feedback page (~30s)
- `/feedback` English
- `/feedback?lang=fr` French
- Locale-formatted date

## 10. Close (~20s)
- Point to README setup + Parts C/D/E justifications
- `npm test` runs offline (refund + slot validation)
