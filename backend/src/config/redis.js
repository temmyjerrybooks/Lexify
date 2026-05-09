const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');

let redis = null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token && !url.includes('your-redis')) {
  redis = new Redis({ url, token });
  logger.info('Upstash Redis (REST) connected');
} else {
  logger.warn('Upstash Redis not configured — caching disabled');
}

// cache.get / cache.set wrappers that are no-ops when Redis is absent
const cache = {
  async get(key) {
    if (!redis) return null;
    try { return await redis.get(key); } catch { return null; }
  },
  async set(key, value, ttlSeconds = 300) {
    if (!redis) return;
    try { await redis.set(key, value, { ex: ttlSeconds }); } catch {}
  },
  async del(key) {
    if (!redis) return;
    try { await redis.del(key); } catch {}
  },
};

module.exports = { redis, cache };
