const axios = require('axios');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;
const configured = APP_ID && APP_ID !== 'your-app-id';

// Send a push via OneSignal to a specific user (tagged by user_id at registration)
const sendPush = async (userId, title, body, data = {}) => {
  if (!configured) {
    logger.debug('OneSignal not configured — skipping push for user', userId);
    return null;
  }
  try {
    const { data: result } = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: APP_ID,
        include_aliases: { external_id: [userId] },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: body },
        data,
      },
      { headers: { Authorization: `Basic ${API_KEY}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`Push sent to user ${userId}: "${title}" (id=${result.id})`);
    return result;
  } catch (err) {
    logger.warn('OneSignal push failed:', err.response?.data?.errors || err.message);
    return null;
  }
};

// FIX [B4]: Column was 'metadata' but schema defines it as 'data' — all in-app
// notifications were silently failing because Supabase rejected the unknown column.
const saveInApp = async (userId, title, body, type, metadata = {}) => {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    data: metadata,   // column is 'data', not 'metadata'
    read: false,
  });
  if (error) logger.warn('Failed to save in-app notification:', error.message);
};

// ─── Typed helpers ────────────────────────────────────────────────────────────

const sendScoreReady = async (userId, skill, score, feedbackId) => {
  const title = 'Your Score Is Ready!';
  const body = `${skill} score: ${score}/9.0 — tap to view detailed feedback.`;
  await Promise.all([
    sendPush(userId, title, body, { type: 'score_ready', feedback_id: feedbackId }),
    saveInApp(userId, title, body, 'score_ready', { feedback_id: feedbackId, skill, score }),
  ]);
};

const sendStreakReminder = async (userId, currentStreak) => {
  const title = currentStreak > 0 ? `Keep your ${currentStreak}-day streak alive!` : 'Start your streak today!';
  const body = 'Practice for just 10 minutes to maintain your progress.';
  await Promise.all([
    sendPush(userId, title, body, { type: 'streak_reminder' }),
    saveInApp(userId, title, body, 'streak_reminder', { current_streak: currentStreak }),
  ]);
};

module.exports = { sendPush, sendScoreReady, sendStreakReminder };
