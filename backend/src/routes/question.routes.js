const router = require('express').Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

// GET /questions — Fetch questions for adaptive practice (Pro+)
router.get('/', verifyToken, requireSubscription('PRO'), async (req, res, next) => {
  try {
    const { exam_type, skill, difficulty, tags, limit = 10 } = req.query;

    let query = supabase
      .from('questions')
      .select('id, question_type, skill, exam_type, question_text, options, points, difficulty, tags')
      .limit(parseInt(limit));

    if (exam_type) query = query.eq('exam_type', exam_type.toUpperCase());
    if (skill) query = query.eq('skill', skill.toUpperCase());
    if (difficulty) query = query.eq('difficulty', difficulty.toUpperCase());
    if (tags) query = query.overlaps('tags', tags.split(','));

    const { data, error } = await query;
    if (error) throw new AppError('Failed to fetch questions.', 500);

    res.json({ questions: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
