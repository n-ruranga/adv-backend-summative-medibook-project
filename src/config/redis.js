require('dotenv').config();

const Redis = require('ioredis');

/**
 * Shared Redis client for waitlist and background job queues.
 */
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;
