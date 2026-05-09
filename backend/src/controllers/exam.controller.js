const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const streakService = require('../services/streak.service');
const scoringService = require('../services/scoring.service');
const { cache } = require('../config/redis');

const MAX_PAGE_LIMIT = 100;
const XP_PER_SCORE_POINT = 10;

// GET /exams — List available exams, with optional filters
const listExams = async (req, res, next) => {
  try {
    const { exam_type, difficulty, skill, page = 1 } = req.query;
    // FIX [S4]: Cap limit to prevent unbounded data dumps
    const limit = Math.min(parseInt(req.query.limit) || 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const cacheKey = `exams:list:${exam_type || 'all'}:${difficulty || 'all'}:${skill || 'all'}:${page}:${limit}`;

    let query = supabase
      .from('exams')
      .select('id, exam_type, title, description, difficulty, skills, total_duration_minutes, is_free', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (exam_type) query = query.eq('exam_type', exam_type.toUpperCase());
    if (difficulty) query = query.eq('difficulty', difficulty.toUpperCase());
    if (skill) query = query.contains('skills', [skill.toUpperCase()]);

    const userId = req.userId;
    let isFreeOnly = !userId;

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();
      if (profile?.subscription_tier === 'FREE') isFreeOnly = true;
    }

    if (isFreeOnly) query = query.eq('is_free', true);

    if (isFreeOnly) {
      const cached = await cache.get(cacheKey);
      if (cached) return res.json({ ...cached, cached: true });
    }

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch exams.', 500);

    const payload = { exams: data, pagination: { page: parseInt(page), limit, total: count } };

    if (isFreeOnly) await cache.set(cacheKey, payload, 300);

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

// GET /exams/:examId — Full exam details including sections
const getExamDetails = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const { data: exam, error } = await supabase
      .from('exams')
      .select(`
        *,
        exam_sections (
          id, skill, title, instructions, duration_minutes, order_index, audio_url, passage_text,
          questions (
            id, question_type, skill, order_index, question_text, options,
            points, difficulty, tags, chart_data
          )
        )
      `)
      .eq('id', examId)
      .eq('is_published', true)
      .single();

    if (error || !exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    exam.exam_sections.sort((a, b) => a.order_index - b.order_index);
    exam.exam_sections.forEach(section => {
      section.questions.sort((a, b) => a.order_index - b.order_index);
    });

    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

// POST /exams/:examId/sessions/start — Begin a mock exam
const startSession = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const userId = req.userId;

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, is_free, total_duration_minutes')
      .eq('id', examId)
      .eq('is_published', true)
      .single();

    if (examError || !exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const { data: existing } = await supabase
      .from('exam_sessions')
      .select('id, status, started_at')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .eq('status', 'IN_PROGRESS')
      .maybeSingle();

    if (existing) {
      return res.json({
        session_id: existing.id,
        status: 'resumed',
        started_at: existing.started_at,
        message: 'Resuming your in-progress session.',
      });
    }

    const { data: section } = await supabase
      .from('exam_sections')
      .select('id')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!section) {
      return res.status(422).json({ error: 'This exam has no sections and cannot be started.' });
    }

    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .insert({
        user_id: userId,
        exam_id: examId,
        status: 'IN_PROGRESS',
        current_section_id: section.id,
        current_question_index: 0,
        device_info: {
          // FIX [S8]: Truncate user_agent to prevent oversized payloads; sanitize platform
          user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
          platform: String(req.body.platform || '').slice(0, 50),
        },
      })
      .select()
      .single();

    if (sessionError) throw new AppError('Could not create exam session.', 500);

    res.status(201).json({
      session_id: session.id,
      status: 'started',
      started_at: session.started_at,
    });
  } catch (err) {
    next(err);
  }
};

// POST /exams/sessions/:sessionId/answer — Submit a single answer
const submitAnswer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { question_id, answer_text, answer_options, time_spent_seconds } = req.body;
    const userId = req.userId;

    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id, status, exam_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: `Session is ${session.status} and cannot accept new answers.` });
    }

    const { data: question } = await supabase
      .from('questions')
      .select('question_type, correct_answer, points')
      .eq('id', question_id)
      .single();

    let is_correct = null;
    let points_earned = 0;

    if (question && ['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'FILL_IN_BLANK', 'MATCHING', 'SHORT_ANSWER'].includes(question.question_type)) {
      // FIX [Q11]: Guard against null correct_answer in DB to avoid false is_correct=true
      if (question.correct_answer != null) {
        const userAnswer = answer_options?.[0] || answer_text?.trim()?.toUpperCase();
        is_correct = userAnswer === question.correct_answer.trim().toUpperCase();
        points_earned = is_correct ? (question.points || 1) : 0;
      }
    }

    const { data: answer, error: answerError } = await supabase
      .from('user_answers')
      .upsert({
        session_id: sessionId,
        question_id,
        user_id: userId,
        answer_text,
        answer_options,
        is_correct,
        points_earned,
        time_spent_seconds,
      }, { onConflict: 'session_id,question_id' })
      .select()
      .single();

    if (answerError) throw new AppError('Could not save answer.', 500);

    res.json({
      answer_id: answer.id,
      is_correct,
      points_earned,
    });
  } catch (err) {
    next(err);
  }
};

// POST /exams/sessions/:sessionId/complete — Finish the exam, calculate results
const completeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, started_at, status')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status === 'COMPLETED') return res.status(409).json({ error: 'Session already completed.' });

    const timeSpentSeconds = Math.floor((Date.now() - new Date(session.started_at)) / 1000);

    const result = await scoringService.calculateSessionScore(sessionId, session.exam_id);

    // FIX [B7]: Check the session update error before continuing — prevents status/result inconsistency
    const { error: updateError } = await supabase
      .from('exam_sessions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), time_spent_seconds: timeSpentSeconds })
      .eq('id', sessionId);

    if (updateError) throw new AppError('Could not finalize exam session.', 500);

    const { data: savedResult, error: resultError } = await supabase
      .from('exam_results')
      .insert({ ...result, session_id: sessionId, user_id: userId, exam_id: session.exam_id })
      .select()
      .single();

    if (resultError) throw new AppError(`Could not save result: ${resultError.message}`, 500);

    // FIX [B2]: Previously used supabase.rpc() as a column value (returns a Promise, not a number).
    // Use a dedicated RPC function to atomically increment XP.
    const xpEarned = Math.round((result.overall_score || 0) * XP_PER_SCORE_POINT);
    if (xpEarned > 0) {
      await supabase.rpc('increment_user_xp', { p_user_id: userId, p_amount: xpEarned });
    }

    await streakService.recordActivity(userId, xpEarned);

    res.json({
      result_id: savedResult.id,
      overall_score: result.overall_score,
      band_score: result.band_score,
      score_breakdown: result.score_breakdown,
      weak_areas: result.weak_areas,
      xp_earned: xpEarned,
    });
  } catch (err) {
    next(err);
  }
};

// FIX [B8]: Added error checking — previously always returned 200 even on DB failure
const pauseSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { current_question_index, snapshot } = req.body;

    const { error } = await supabase
      .from('exam_sessions')
      .update({ status: 'PAUSED', current_question_index, snapshot })
      .eq('id', sessionId)
      .eq('user_id', req.userId);

    if (error) throw new AppError('Could not pause session.', 500);

    res.json({ message: 'Session paused. You can resume at any time.' });
  } catch (err) {
    next(err);
  }
};

// FIX [B9]: Added proper error handling — previously swallowed supabase errors from .single()
const resumeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', sessionId)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error || !session) return res.status(404).json({ error: 'Session not found.' });

    res.json({ session });
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', req.userId)
      .single();

    if (error || !session) return res.status(404).json({ error: 'Session not found.' });

    res.json({ session });
  } catch (err) {
    next(err);
  }
};

// FIX [B10]: Daily challenge seed is now bounded by the actual question count to prevent
// empty results when the seed exceeds the number of rows in the table.
const getDailyChallenge = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Count eligible questions first so the seed stays in bounds
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .not('question_type', 'in', '(ESSAY,SPEAKING_RESPONSE)');

    const totalCount = count || 0;

    if (totalCount === 0) {
      return res.json({ date: today, questions: [] });
    }

    const batchSize = 5;
    const seed = totalCount > batchSize
      ? parseInt(today.replace(/-/g, ''), 10) % (totalCount - batchSize)
      : 0;

    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, options, correct_answer, question_type, skill, exam_type, difficulty, points')
      .not('question_type', 'in', '(ESSAY,SPEAKING_RESPONSE)')
      .order('created_at', { ascending: true })
      .range(seed, seed + batchSize - 1);

    res.json({ date: today, questions: questions || [] });
  } catch (err) {
    next(err);
  }
};

// GET /exams/sessions/:sessionId/review
const getSessionReview = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sErr } = await supabase
      .from('exam_sessions')
      .select('id, exam_id, status, time_spent_seconds')
      .eq('id', sessionId)
      .eq('user_id', req.userId)
      .single();

    if (sErr || !session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status !== 'COMPLETED') return res.status(403).json({ error: 'Answers are only revealed after the session is completed.' });

    const { data: answers, error: aErr } = await supabase
      .from('user_answers')
      .select(`
        id, answer_text, answer_options, is_correct, points_earned, time_spent_seconds,
        questions (
          id, question_text, question_type, options, correct_answer, skill, section_id,
          exam_sections ( skill, title, order_index )
        )
      `)
      .eq('session_id', sessionId)
      .eq('user_id', req.userId)
      .order('submitted_at', { ascending: true });

    if (aErr) throw new AppError('Failed to fetch session answers.', 500);

    const sections = {};
    for (const a of answers || []) {
      const q = a.questions;
      const sec = q?.exam_sections;
      const key = q?.section_id || 'unknown';
      if (!sections[key]) {
        sections[key] = {
          section_id: key,
          skill: sec?.skill || q?.skill,
          title: sec?.title,
          order_index: sec?.order_index ?? 0,
          questions: [],
        };
      }
      sections[key].questions.push({
        question_id: q?.id,
        question_text: q?.question_text,
        question_type: q?.question_type,
        options: q?.options,
        correct_answer: q?.correct_answer,
        user_answer: a.answer_options?.[0] || a.answer_text,
        is_correct: a.is_correct,
        points_earned: a.points_earned,
        time_spent_seconds: a.time_spent_seconds,
      });
    }

    const sortedSections = Object.values(sections).sort((a, b) => a.order_index - b.order_index);
    const totalQ = answers?.length || 0;
    const correctQ = answers?.filter(a => a.is_correct).length || 0;

    res.json({
      session_id: sessionId,
      total_questions: totalQ,
      correct_count: correctQ,
      accuracy_pct: totalQ ? Math.round((correctQ / totalQ) * 100) : 0,
      sections: sortedSections,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listExams, getExamDetails, startSession, submitAnswer, completeSession,
  pauseSession, resumeSession, getSession, getSessionReview, getDailyChallenge,
};
