const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

const MAX_PAGE_LIMIT = 100;
const MAX_ANALYTICS_DAYS = 365;

const getResult = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    const { data: result, error } = await supabase
      .from('exam_results')
      .select(`
        *,
        exams (exam_type, title),
        exam_sessions (time_spent_seconds)
      `)
      .eq('id', resultId)
      .eq('user_id', req.userId)
      .single();

    if (error || !result) {
      return res.status(404).json({ error: 'Result not found.' });
    }

    res.json({ result: { ...result, exam_type: result.exams?.exam_type, exam_title: result.exams?.title } });
  } catch (err) {
    next(err);
  }
};

const getUserResults = async (req, res, next) => {
  try {
    const { exam_type, page = 1 } = req.query;
    // FIX [S4]: Cap limit to prevent unbounded data fetches
    const limit = Math.min(parseInt(req.query.limit) || 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('exam_results')
      .select(`
        id, overall_score, band_score, cefr_level, created_at,
        reading_score, listening_score, writing_score, speaking_score,
        exams (exam_type, title)
      `, { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (exam_type) {
      const { data: examIds } = await supabase
        .from('exams').select('id').eq('exam_type', exam_type.toUpperCase());
      if (examIds?.length) {
        query = query.in('exam_id', examIds.map(e => e.id));
      }
    }

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch results.', 500);

    res.json({ results: data, pagination: { page: parseInt(page), limit, total: count } });
  } catch (err) {
    next(err);
  }
};

// FIX [P1]: getAnalytics previously fetched ALL results with no server-side limit,
// which could load thousands of rows for active long-term users into memory.
// Now capped at MAX_ANALYTICS_DAYS and a hard row limit of 500.
const getAnalytics = async (req, res, next) => {
  try {
    const { exam_type } = req.query;
    const days = Math.min(parseInt(req.query.days) || 90, MAX_ANALYTICS_DAYS);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('exam_results')
      .select('id, overall_score, band_score, reading_score, listening_score, writing_score, speaking_score, created_at, exams(exam_type, title)')
      .eq('user_id', req.userId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(500); // hard cap — no single user needs more than 500 results for a chart

    if (exam_type) {
      const { data: examIds } = await supabase
        .from('exams').select('id').eq('exam_type', exam_type.toUpperCase());
      if (examIds?.length) {
        query = query.in('exam_id', examIds.map(e => e.id));
      }
    }

    const { data: results, error } = await query;
    if (error) throw new AppError('Failed to fetch analytics.', 500);

    const allScores = results.map(r => r.band_score || r.overall_score).filter(Boolean);
    const avgScore = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : null;
    const bestScore = allScores.length ? Math.max(...allScores) : null;
    const trend = allScores.length >= 2 ? allScores[allScores.length - 1] - allScores[0] : null;

    const scoreHistory = results.map(r => ({
      date: r.created_at.split('T')[0],
      score: r.band_score || r.overall_score,
      exam_type: r.exams?.exam_type,
    }));

    const skillAvg = (key) => {
      const vals = results.map(r => r[key]).filter(Boolean);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    };

    const recentResults = [...results].reverse().slice(0, 5).map(r => ({
      id: r.id,
      exam_type: r.exams?.exam_type,
      exam_title: r.exams?.title,
      band_score: r.band_score,
      overall_score: r.overall_score,
      created_at: r.created_at,
    }));

    res.json({
      summary: {
        total_exams: results.length,
        avg_score: parseFloat(avgScore),
        best_score: bestScore,
        trend: trend ? parseFloat(trend.toFixed(1)) : null,
      },
      skill_averages: {
        reading: parseFloat(skillAvg('reading_score')),
        listening: parseFloat(skillAvg('listening_score')),
        writing: parseFloat(skillAvg('writing_score')),
        speaking: parseFloat(skillAvg('speaking_score')),
      },
      score_history: scoreHistory,
      recent_results: recentResults,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getResult, getUserResults, getAnalytics };
