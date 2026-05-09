/**
 * Groq API key rotator — round-robin across up to 5 keys.
 * When a key hits a 429, it goes into cooldown and the next key is used automatically.
 *
 * Add keys in .env as GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, etc.
 * Any key that is missing or empty is silently skipped.
 */

const Groq = require('groq-sdk');

const keys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
].filter(Boolean);

if (keys.length === 0) {
  throw new Error('No Groq API key found. Set GROQ_API_KEY in your .env file.');
}

const clients = keys.map((apiKey) => new Groq({ apiKey }));

// Timestamp (ms) after which each key is available again. 0 = available now.
const cooldownUntil = new Array(keys.length).fill(0);

let roundRobinIndex = 0;

/**
 * Returns the next available Groq client + its key index.
 * Skips keys that are currently in cooldown.
 * If all keys are cooling down, returns the one with the shortest remaining wait.
 */
const getClient = () => {
  const now = Date.now();

  for (let i = 0; i < clients.length; i++) {
    const idx = (roundRobinIndex + i) % clients.length;
    if (cooldownUntil[idx] <= now) {
      roundRobinIndex = (idx + 1) % clients.length;
      return { client: clients[idx], keyIndex: idx };
    }
  }

  // All keys in cooldown — pick the one that recovers soonest
  let minIdx = 0;
  for (let i = 1; i < cooldownUntil.length; i++) {
    if (cooldownUntil[i] < cooldownUntil[minIdx]) minIdx = i;
  }
  return { client: clients[minIdx], keyIndex: minIdx };
};

/**
 * Call after a 429 response to put that key into cooldown.
 * @param {number} keyIndex - index returned by getClient()
 * @param {number} retryAfterMs - how long to cool down (default 60s)
 */
const markRateLimited = (keyIndex, retryAfterMs = 60_000) => {
  cooldownUntil[keyIndex] = Date.now() + retryAfterMs;
};

const keyCount = keys.length;

module.exports = { getClient, markRateLimited, keyCount };
