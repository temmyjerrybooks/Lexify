const supabase = require('../config/supabase');

// Record a practice activity and update the user's streak
const recordActivity = async (userId, xpEarned = 0, questionsAnswered = 0, minutesPracticed = 0) => {
  const today = new Date().toISOString().split('T')[0];

  // Upsert today's activity log
  await supabase
    .from('daily_activities')
    .upsert({
      user_id: userId,
      activity_date: today,
      xp_earned: xpEarned,
      questions_answered: questionsAnswered,
      minutes_practiced: minutesPracticed,
      sessions_completed: 1,
    }, {
      onConflict: 'user_id,activity_date',
      // Increment rather than replace (user might practice multiple times per day)
      ignoreDuplicates: false,
    });

  // Recalculate streak
  await updateStreak(userId, today);
};

const updateStreak = async (userId, today) => {
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!streak) return;

  const lastActivity = streak.last_activity_date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = streak.current_streak;

  if (lastActivity === today) {
    // Already practiced today — no change needed
    return;
  } else if (lastActivity === yesterdayStr) {
    // Consecutive day — increment streak
    newStreak = streak.current_streak + 1;
  } else if (lastActivity === null) {
    // First ever activity
    newStreak = 1;
  } else {
    // Streak broken — check if user has a freeze token
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_freeze_tokens')
      .eq('id', userId)
      .single();

    if (profile?.streak_freeze_tokens > 0) {
      // Use a freeze token to preserve the streak
      await supabase
        .from('profiles')
        .update({ streak_freeze_tokens: profile.streak_freeze_tokens - 1 })
        .eq('id', userId);
      newStreak = streak.current_streak; // Preserved
    } else {
      // Streak resets to 1
      newStreak = 1;
    }
  }

  await supabase
    .from('streaks')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, streak.longest_streak),
      last_activity_date: today,
      streak_start_date: newStreak === 1 ? today : streak.streak_start_date,
      total_practice_days: streak.total_practice_days + (lastActivity === today ? 0 : 1),
    })
    .eq('user_id', userId);
};

const getStreakStatus = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  const practicedToday = streak?.last_activity_date === today;

  // Hours until midnight in user's local timezone (simplified — use UTC for now)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = Math.floor((midnight - now) / 1000 / 60 / 60);

  return {
    current_streak: streak?.current_streak || 0,
    longest_streak: streak?.longest_streak || 0,
    practiced_today: practicedToday,
    streak_at_risk: !practicedToday && (streak?.current_streak || 0) > 0 && hoursUntilMidnight < 4,
    hours_to_midnight: hoursUntilMidnight,
  };
};

module.exports = { recordActivity, updateStreak, getStreakStatus };
