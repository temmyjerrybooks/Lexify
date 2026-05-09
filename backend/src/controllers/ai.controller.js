const supabase = require('../config/supabase');
const aiService = require('../services/ai.service');
const speechService = require('../services/speech.service');
const aiQueue = require('../config/queue');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Try to enqueue a Bull job; if Redis is unavailable, run fallback immediately
const enqueue = async (jobName, data, fallback) => {
  try {
    const job = await aiQueue.add(jobName, data, { timeout: 120000 });
    logger.info(`Queued ${jobName} job ${job.id}`);
  } catch (err) {
    logger.warn(`Queue unavailable for ${jobName} (${err.message}) — running fire-and-forget fallback`);
    fallback().catch((e) => logger.error(`Fallback ${jobName} failed:`, e.message));
  }
};

// POST /ai/score/writing
const scoreWriting = async (req, res, next) => {
  try {
    const { session_id, answer_id, task_number, question_text, user_answer, exam_type } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required.' });
    }
    if (!user_answer || user_answer.trim().length < 50) {
      return res.status(400).json({ error: 'Answer is too short to score (minimum 50 characters).' });
    }

    const { data: pending, error: pendingError } = await supabase
      .from('ai_feedback')
      .insert({ answer_id, session_id, user_id: req.userId, skill: 'WRITING', status: 'PROCESSING', criteria_scores: {} })
      .select()
      .single();

    if (pendingError) throw new AppError(`Could not create feedback record: ${pendingError.message}`, 500);

    const fallback = async () => {
      try {
        let result;
        if (exam_type === 'IELTS') {
          result = await aiService.scoreIELTSWriting({ task_number, question_text, user_answer });
        } else if (['TEF', 'TCF'].includes(exam_type)) {
          result = await aiService.scoreTEFWriting({ exam_type, task_number, question_text, user_answer });
        } else {
          result = await aiService.scoreIELTSWriting({ task_number, question_text, user_answer });
        }
        await supabase.from('ai_feedback').update({
          criteria_scores: result.criteria_scores,
          overall_score: result.overall_score,
          strengths: result.strengths || result.points_forts,
          improvements: result.improvements || result.points_ameliorer,
          detailed_feedback: result.detailed_feedback || result.commentaires_detailles,
          model_answer: result.model_answer_excerpt || result.exemple_bonne_reponse,
          ai_model: result.ai_model,
          tokens_used: result.tokens_used,
          status: 'COMPLETED',
        }).eq('id', pending.id);
      } catch (err) {
        logger.error('Fallback writing score failed:', err.message);
        await supabase.from('ai_feedback').update({ status: 'FAILED', error_message: err.message }).eq('id', pending.id);
      }
    };

    await enqueue('score-writing', {
      feedbackId: pending.id,
      userId: req.userId,
      examType: exam_type,
      taskNumber: task_number,
      questionText: question_text,
      userAnswer: user_answer,
    }, fallback);

    res.status(202).json({
      feedback_id: pending.id,
      status: 'processing',
      message: 'Your essay is being scored by AI. Check back in 10–15 seconds.',
      poll_url: `/api/v1/ai/feedback/${pending.id}`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /ai/score/speaking (multipart/form-data with audio file)
// FIX [P2]: Previously the raw audio buffer (up to 25 MB) was serialized into the
// Bull job payload and stored in Redis as a base64 JSON string. Under concurrent load
// this can exhaust Redis memory. Now the audio is uploaded to Supabase Storage first
// and only the storage path (a short string) is passed to the queue.
const scoreSpeaking = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio file is required.' });

    const { session_id, answer_id, question_id, question_text, part_number = 1, exam_type = 'IELTS' } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required.' });
    }

    const { data: pending, error: pendingError } = await supabase
      .from('ai_feedback')
      .insert({ answer_id, session_id, user_id: req.userId, skill: 'SPEAKING', status: 'PROCESSING', criteria_scores: {} })
      .select()
      .single();

    if (pendingError) throw new AppError(`Could not create feedback record: ${pendingError.message}`, 500);

    const { buffer, mimetype, originalname } = req.file;

    // Upload audio to storage immediately — pass only the storage path to the queue
    let audioStoragePath = null;
    try {
      audioStoragePath = await speechService.uploadAudioToStorage(
        buffer, req.userId, session_id, question_id || pending.id, mimetype
      );
    } catch (storageErr) {
      logger.warn('Pre-queue audio upload failed, will retry in worker:', storageErr.message);
    }

    const fallback = async () => {
      try {
        const { text: transcript, duration, words } = await speechService.transcribeAudio(buffer, mimetype, originalname);
        const fluencyStats = speechService.analyzeFluency(words, duration);
        const result = await aiService.scoreIELTSSpeaking({
          transcript, question_text, part_number: parseInt(part_number), fluency_stats: fluencyStats,
        });

        if (answer_id) {
          await supabase.from('user_answers')
            .update({ answer_audio_url: audioStoragePath, answer_text: transcript })
            .eq('id', answer_id);
        }
        await supabase.from('ai_feedback').update({
          transcript,
          criteria_scores: { ...result.criteria_scores, ...fluencyStats },
          overall_score: result.overall_score,
          strengths: result.strengths,
          improvements: result.improvements,
          detailed_feedback: result.detailed_feedback,
          ai_model: result.ai_model,
          tokens_used: result.tokens_used,
          status: 'COMPLETED',
        }).eq('id', pending.id);
      } catch (err) {
        logger.error('Fallback speaking score failed:', err.message);
        await supabase.from('ai_feedback').update({ status: 'FAILED', error_message: err.message }).eq('id', pending.id);
      }
    };

    await enqueue('score-speaking', {
      feedbackId: pending.id,
      userId: req.userId,
      answerId: answer_id,
      sessionId: session_id,
      questionId: question_id,
      questionText: question_text,
      partNumber: part_number,
      examType: exam_type,
      audioStoragePath,   // only the path string — no raw buffer in Redis
      mimeType: mimetype,
      originalname,
    }, fallback);

    res.status(202).json({
      feedback_id: pending.id,
      status: 'processing',
      message: 'Your speaking response is being transcribed and scored. Check back in 20–30 seconds.',
      poll_url: `/api/v1/ai/feedback/${pending.id}`,
    });
  } catch (err) {
    next(err);
  }
};

// GET /ai/feedback/session/:sessionId — All feedback records for a session
const getSessionFeedback = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { data: feedback, error } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Failed to fetch feedback.' });

    const stillProcessing = feedback.some(f => f.status === 'PROCESSING');
    res.json({ feedback, still_processing: stillProcessing });
  } catch (err) {
    next(err);
  }
};

// GET /ai/feedback/:feedbackId — Poll for async feedback completion
const getFeedbackStatus = async (req, res, next) => {
  try {
    const { feedbackId } = req.params;
    const { data: feedback, error } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('id', feedbackId)
      .eq('user_id', req.userId)
      .single();

    if (error || !feedback) return res.status(404).json({ error: 'Feedback not found.' });
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
};

const generateQuestions = async (req, res, next) => {
  try {
    const { exam_type, skill, difficulty, topic, count = 5 } = req.body;
    if (!exam_type || !skill) return res.status(400).json({ error: 'exam_type and skill are required.' });
    const questions = await aiService.generateQuestions({ exam_type, skill, difficulty, topic, count });
    res.json({ questions });
  } catch (err) {
    next(err);
  }
};

const chatWithTutor = async (req, res, next) => {
  try {
    const { messages } = req.body;
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_exam, exam_date')
      .eq('id', req.userId)
      .single();

    const result = await aiService.chatWithTutor({
      exam_type: profile?.target_exam || 'IELTS',
      messages,
      user_context: { exam_date: profile?.exam_date },
    });
    res.json({ reply: result.content, tokens_used: result.tokens_used });
  } catch (err) {
    next(err);
  }
};

module.exports = { scoreWriting, scoreSpeaking, getFeedbackStatus, getSessionFeedback, generateQuestions, chatWithTutor };
