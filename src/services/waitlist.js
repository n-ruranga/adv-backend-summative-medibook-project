const redis = require('../config/redis');

const PROMOTION_QUEUE_KEY = 'queue:promotions';

/**
 * @param {number} doctorId
 * @param {string} day YYYY-MM-DD
 */
function dayWaitlistKey(doctorId, day) {
  return `waitlist:day:${doctorId}:${day}`;
}

/**
 * @param {number} doctorId
 * @param {string} day YYYY-MM-DD
 * @param {string} timeHm HH:mm
 */
function slotWaitlistKey(doctorId, day, timeHm) {
  return `waitlist:slot:${doctorId}:${day}:${timeHm}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {Date} date
 * @returns {{ day: string, timeHm: string, apptDatetime: string }}
 */
function splitDateParts(date) {
  const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const timeHm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const apptDatetime = `${day} ${timeHm}:00`;
  return { day, timeHm, apptDatetime };
}

/**
 * Enqueue a patient onto a day or slot waitlist (FIFO: RPUSH + LPOP).
 * @param {{ patientId: number, doctorId: number, apptDatetime: Date|string, scope: 'day'|'slot' }} entry
 */
async function enqueueWaitlist({ patientId, doctorId, apptDatetime, scope }) {
  const date = apptDatetime instanceof Date ? apptDatetime : new Date(apptDatetime);
  if (Number.isNaN(date.getTime())) {
    throw new Error('apptDatetime must be a valid date');
  }

  const { day, timeHm, apptDatetime: normalized } = splitDateParts(date);
  const payload = JSON.stringify({
    patientId,
    doctorId,
    apptDatetime: normalized,
    scope,
    enqueuedAt: new Date().toISOString(),
  });

  const key =
    scope === 'slot'
      ? slotWaitlistKey(doctorId, day, timeHm)
      : dayWaitlistKey(doctorId, day);

  await redis.rpush(key, payload);
  const position = await redis.llen(key);

  return {
    key,
    scope,
    day,
    timeHm,
    position,
    patientId,
    doctorId,
    apptDatetime: normalized,
  };
}

/**
 * Pop the next waitlisted patient for a freed slot (slot queue first, then day).
 * @param {number} doctorId
 * @param {Date|string} apptDatetime
 * @returns {Promise<object|null>}
 */
async function dequeueForSlot(doctorId, apptDatetime) {
  const date = apptDatetime instanceof Date ? apptDatetime : new Date(apptDatetime);
  const { day, timeHm } = splitDateParts(date);

  const slotRaw = await redis.lpop(slotWaitlistKey(doctorId, day, timeHm));
  if (slotRaw) {
    return JSON.parse(slotRaw);
  }

  const dayRaw = await redis.lpop(dayWaitlistKey(doctorId, day));
  if (dayRaw) {
    const entry = JSON.parse(dayRaw);
    // Day-waitlisted patients take the freed slot datetime.
    return {
      ...entry,
      apptDatetime: `${day} ${timeHm}:00`,
      scope: 'day',
    };
  }

  return null;
}

/**
 * Put a patient back onto the front of the appropriate waitlist (failed promotion).
 * @param {object} entry
 */
async function requeueFront(entry) {
  const date = new Date(entry.apptDatetime);
  const { day, timeHm } = splitDateParts(date);
  const key =
    entry.scope === 'slot'
      ? slotWaitlistKey(entry.doctorId, day, timeHm)
      : dayWaitlistKey(entry.doctorId, day);

  await redis.lpush(key, JSON.stringify(entry));
  return key;
}

/**
 * Notify the worker that a cancellation freed a slot.
 */
async function enqueuePromotionJob({ doctorId, apptDatetime }) {
  const date = apptDatetime instanceof Date ? apptDatetime : new Date(apptDatetime);
  const { day, timeHm, apptDatetime: normalized } = splitDateParts(date);
  const job = JSON.stringify({
    doctorId,
    day,
    timeHm,
    apptDatetime: normalized,
    enqueuedAt: new Date().toISOString(),
  });
  await redis.rpush(PROMOTION_QUEUE_KEY, job);
  return job;
}

async function popPromotionJob(timeoutSeconds = 5) {
  const result = await redis.blpop(PROMOTION_QUEUE_KEY, timeoutSeconds);
  if (!result) {
    return null;
  }
  return JSON.parse(result[1]);
}

module.exports = {
  PROMOTION_QUEUE_KEY,
  dayWaitlistKey,
  slotWaitlistKey,
  splitDateParts,
  enqueueWaitlist,
  dequeueForSlot,
  requeueFront,
  enqueuePromotionJob,
  popPromotionJob,
};
