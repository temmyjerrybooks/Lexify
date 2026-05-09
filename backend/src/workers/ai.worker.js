const aiQueue = require('../config/queue');
const supabase = require('../config/supabase');
const aiService = require('../services/ai.service');
const speechService = require('../services/speech.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// ─── Writing scorer ───────────────────────────────────────────────────────────

aiQueue.process('score-writing', async (job) => {
  const { feedbackId, userId, examType, taskNumber, questionText, userAnswer } = job.data;
  logger.info(`Processing writing job ${job.id} for feedback ${feedbackId}`);

  let result;
  if (examType === 'IELTS') {
    result = await aiService.scoreIELTSWriting({ task_number: taskNumber, question_text: questionText, user_answer: userAnswer });
  } else if (['TEF', 'TCF'].includes(examType)) {
    result = await aiService.scoreTEFWriting({ exam_type: examType, task_number: taskNumber, question_text: questionText, user_answer: userAnswer });
  } else {
    result = await aiService.scoreIELTSWriting({ task_number: taskNumber, question_text: questionText, user_answer: userAnswer });
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
  }).eq('id', feedbackId);

  await notificationService.sendScoreReady(userId, 'Writing', result.overall_score, feedbackId);
  return { feedbackId, overall_score: result.overall_score };
});

// ─── Speaking scorer ──────────────────────────────────────────────────────────
// FIX [P2]: Job payload now carries audioStoragePath (a string URL) instead of the
// raw audioBuffer. The controller uploads to Supabase Storage before queuing so that
// the Redis job payload stays small. The worker fetches the buffer from storage here.

aiQueue.process('score-speaking', async (job) => {
  const { feedbackId, userId, answerId, questionText, partNumber, audioStoragePath, mimeType, originalname } = job.data;
  logger.info(`Processing speaking job ${job.id} for feedback ${feedbackId}`);

  if (!audioStoragePath) throw new Error('No audio storage path in job payload — cannot transcribe.');

  const audioResponse = await fetch(audioStoragePath);
  if (!audioResponse.ok) throw new Error(`Failed to download audio from storage: ${audioResponse.status}`);
  const buffer = Buffer.from(await audioResponse.arrayBuffer());

  const { text: transcript, duration, words } = await speechService.transcribeAudio(buffer, mimeType, originalname);
  const fluencyStats = speechService.analyzeFluency(words, duration);

  const result = await aiService.scoreIELTSSpeaking({ transcript, question_text: questionText, part_number: parseInt(partNumber), fluency_stats: fluencyStats });

  if (answerId) {
    // audioStoragePath is already the public URL — no re-upload needed
    await supabase.from('user_answers').update({ answer_audio_url: audioStoragePath, answer_text: transcript }).eq('id', answerId);
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
  }).eq('id', feedbackId);

  await notificationService.sendScoreReady(userId, 'Speaking', result.overall_score, feedbackId);
  return { feedbackId, overall_score: result.overall_score };
});

// ─── Global error handler (marks DB record FAILED after all retries exhausted) ─

aiQueue.on('failed', async (job, err) => {
  logger.error(`AI job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempt(s):`, err.message);
  if (job.attemptsMade >= job.opts.attempts) {
    await supabase.from('ai_feedback')
      .update({ status: 'FAILED', error_message: err.message })
      .eq('id', job.data.feedbackId);
  }
});

aiQueue.on('completed', (job, result) => {
  logger.info(`AI job ${job.id} completed — score ${result?.overall_score}`);
});

logger.info('AI scoring worker registered (writing + speaking)');
