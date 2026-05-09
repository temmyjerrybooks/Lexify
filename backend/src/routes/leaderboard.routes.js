const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

// FIX [Q7]: Moved helper to top so it is defined before use (was defined after the route handler)
// FIX [Q3]: Replaced bare `throw error` with AppError so status code is always 500,
//           preventing internal Supabase error details from leaking to clients.

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { scope = 'global' } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const weekStart = getWeekStart();

    let query = supabase
      .from('leaderboard_weekly')
      .select(`
        rank_global, rank_country, xp_earned, exams_completed, country_code,
        profiles!inner(username, full_name, avatar_url)
      `)
      .eq('week_start', weekStart)
      .order('xp_earned', { ascending: false })
      .limit(limit);

    if (scope === 'country') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', req.userId)
        .single();

      if (profile?.country_code) {
        query = query.eq('country_code', profile.country_code);
      }
    }

    const { data: entries, error } = await query;
    if (error) throw new AppError('Failed to fetch leaderboard.', 500);

    const { data: myEntry } = await supabase
      .from('leaderboard_weekly')
      .select('rank_global, rank_country, xp_earned')
      .eq('user_id', req.userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    res.json({
      week_start: weekStart,
      scope,
      entries: entries || [],
      my_rank: scope === 'country' ? myEntry?.rank_country : myEntry?.rank_global,
      my_xp: myEntry?.xp_earned || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
