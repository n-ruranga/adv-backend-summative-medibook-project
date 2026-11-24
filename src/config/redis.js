require('dotenv').config();

const Redis = require('ioredis');

/**
 * Shared Redis client for waitlist and background job queues.
 */
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Connect on first command so requiring modules does not spam errors if Redis is down.
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 10) {
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;
