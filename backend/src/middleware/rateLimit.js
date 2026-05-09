const rateLimit = require('express-rate-limit');

const createRateLimiter = (options = {}) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000,
  max: options.max || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please slow down and try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) + ' minutes',
    });
  },
});

// Stricter limiter for AI endpoints — expensive to run
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
});

// Auth endpoints — prevent brute force
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

module.exports = { createRateLimiter, aiRateLimiter, authRateLimiter };
