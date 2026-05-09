const Bull = require('bull');
const logger = require('../utils/logger');

// Parse REDIS_URL into host/port so we can pass full ioredis options
const parseRedisUrl = (url = 'redis://localhost:6379') => {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: parseInt(u.port) || 6379,
      password: u.password || undefined,
      tls: url.startsWith('rediss://') ? {} : undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
};

const redisOpts = {
  ...parseRedisUrl(process.env.REDIS_URL),
  // Log once globally then retry every 30s silently — returning null crashes Node 24
  retryStrategy: (() => {
    let warned = false;
    return (times) => {
      if (times === 1 && !warned) { warned = true; logger.debug('Bull queue: Redis not reachable, AI scoring uses fire-and-forget fallback'); }
      return 30000;
    };
  })(),
  // Fail queue.add() immediately when offline so the controller falls back to fire-and-forget
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
};

const aiQueue = new Bull('ai-scoring', { redis: redisOpts }, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

aiQueue.on('ready', () => logger.info('Bull queue ready — Redis connected'));
aiQueue.on('error', () => {}); // errors handled via retryStrategy logging

module.exports = aiQueue;
