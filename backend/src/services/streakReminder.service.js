const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_REMINDER_HOUR = 20;
const DEFAULT_WINDOW_HOURS = 4;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_LIMIT = 500;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const getLocalDateInfo = (now, timeZone = DEFAULT_TIMEZONE) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const yesterdayDate = new Date(Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) - 1
    ));

    return {
      hour: Number(parts.hour),
      today,
      yesterday: formatDate(yesterdayDate),
      timeZone,
    };
  } catch (error) {
    if (timeZone !== DEFAULT_TIMEZONE) {
      logger.warn(`Invalid user timezone "${timeZone}", falling back to UTC.`);
      return getLocalDateInfo(now, DEFAULT_TIMEZONE);
    }
    throw error;
  }
};

const alreadyRemindedToday = (existingReminders, userId, reminderDate) => {
  return existingReminders.some((notification) => (
    notification.user_id === userId &&
    notification.data?.reminder_date === reminderDate
  ));
};

const fetchExistingReminders = async (userIds, now) => {
  if (userIds.length === 0) return [];

  const recentCutoff = new Date(now.getTime() - (48 * 60 * 60 * 1000)).toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .select('user_id,data,created_at')
    .in('user_id', userIds)
    .eq('type', 'streak_reminder')
    .gte('created_at', recentCutoff);

  if (error) {
    logger.warn('Failed to fetch existing streak reminders:', error.message);
    return [];
  }

  return data || [];
};

const sendDueStreakReminders = async ({ now = new Date() } = {}) => {
  const reminderHour = toPositiveInt(process.env.STREAK_REMINDER_HOUR, DEFAULT_REMINDER_HOUR);
  const windowHours = toPositiveInt(process.env.STREAK_REMINDER_WINDOW_HOURS, DEFAULT_WINDOW_HOURS);
  const batchLimit = toPositiveInt(process.env.STREAK_REMINDER_BATCH_LIMIT, DEFAULT_BATCH_LIMIT);

  const { data: streaks, error: streakError } = await supabase
    .from('streaks')
    .select('user_id,current_streak,last_activity_date')
    .gt('current_streak', 0)
    .limit(batchLimit);

  if (streakError) {
    logger.warn('Failed to load streaks for reminders:', streakError.message);
    return { checked: 0, eligible: 0, sent: 0, skipped: 0, error: streakError.message };
  }

  const userIds = (streaks || []).map((streak) => streak.user_id);
  if (userIds.length === 0) return { checked: 0, eligible: 0, sent: 0, skipped: 0 };

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id,timezone,notification_enabled')
    .in('id', userIds)
    .eq('notification_enabled', true);

  if (profileError) {
    logger.warn('Failed to load profiles for streak reminders:', profileError.message);
    return { checked: streaks.length, eligible: 0, sent: 0, skipped: streaks.length, error: profileError.message };
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const candidates = [];

  for (const streak of streaks || []) {
    const profile = profilesById.get(streak.user_id);
    if (!profile) continue;

    const local = getLocalDateInfo(now, profile.timezone || DEFAULT_TIMEZONE);
    const inReminderWindow = local.hour >= reminderHour && local.hour < reminderHour + windowHours;
    const lastActivityDate = streak.last_activity_date ? String(streak.last_activity_date).slice(0, 10) : null;

    if (inReminderWindow && lastActivityDate === local.yesterday) {
      candidates.push({ streak, local });
    }
  }

  if (candidates.length === 0) {
    return { checked: streaks.length, eligible: 0, sent: 0, skipped: streaks.length };
  }

  const existingReminders = await fetchExistingReminders(
    candidates.map(({ streak }) => streak.user_id),
    now
  );

  let sent = 0;
  let skipped = streaks.length - candidates.length;

  for (const { streak, local } of candidates) {
    if (alreadyRemindedToday(existingReminders, streak.user_id, local.today)) {
      skipped += 1;
      continue;
    }

    try {
      await notificationService.sendStreakReminder(streak.user_id, streak.current_streak, {
        reminder_date: local.today,
        timezone: local.timeZone,
      });
      sent += 1;
    } catch (error) {
      skipped += 1;
      logger.warn(`Failed to send streak reminder to ${streak.user_id}:`, error.message);
    }
  }

  if (sent > 0) {
    logger.info(`Sent ${sent} streak reminder notification(s).`);
  }

  return { checked: streaks.length, eligible: candidates.length, sent, skipped };
};

const startStreakReminderScheduler = () => {
  if (process.env.ENABLE_STREAK_REMINDERS === 'false') {
    logger.info('Streak reminder scheduler disabled.');
    return null;
  }

  const intervalMs = toPositiveInt(process.env.STREAK_REMINDER_INTERVAL_MS, DEFAULT_INTERVAL_MS);

  const run = () => {
    sendDueStreakReminders().catch((error) => {
      logger.warn('Streak reminder scheduler failed:', error.message);
    });
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  run();

  logger.info(`Streak reminder scheduler running every ${intervalMs}ms.`);
  return timer;
};

module.exports = {
  sendDueStreakReminders,
  startStreakReminderScheduler,
  getLocalDateInfo,
};
