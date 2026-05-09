const { toFile } = require('groq-sdk');
const { getClient, markRateLimited, keyCount } = require('../utils/groqRotator');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// Transcribe audio using Groq Whisper — rotates keys automatically on 429
const transcribeAudio = async (audioBuffer, mimeType = 'audio/mpeg', filename = 'recording.mp3') => {
  let lastErr;

  for (let attempt = 0; attempt < keyCount + 1; attempt++) {
    const { client, keyIndex } = getClient();
    try {
      const file = await toFile(audioBuffer, filename, { type: mimeType });

      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        words: transcription.words || [],
      };
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '60') * 1000;
        logger.warn(`Groq Whisper key ${keyIndex + 1}/${keyCount} rate-limited — switching key`);
        markRateLimited(keyIndex, retryAfter);
        lastErr = err;
        continue;
      }
      logger.error('Groq Whisper transcription failed:', err.message);
      throw new Error('Audio transcription failed. Please check your recording and try again.');
    }
  }

  throw lastErr || new Error('All Groq keys are rate-limited. Please try again shortly.');
};

// Upload audio to Supabase Storage and return public URL
const uploadAudioToStorage = async (audioBuffer, userId, sessionId, questionId, mimeType) => {
  const extension = mimeType.split('/')[1]?.replace('mpeg', 'mp3') || 'mp3';
  const filePath = `speaking/${userId}/${sessionId}/${questionId}.${extension}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET_AUDIO || 'exam-audio')
    .upload(filePath, audioBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    logger.error('Storage upload failed:', error.message);
    throw new Error('Failed to save audio recording.');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('exam-audio')
    .getPublicUrl(filePath);

  return publicUrl;
};

// Analyze speaking fluency from Whisper word timestamps
const analyzeFluency = (words, totalDuration) => {
  if (!words.length || !totalDuration) return { words_per_minute: 0, pause_ratio: 0 };

  const wordsPerMinute = Math.round((words.length / totalDuration) * 60);

  let totalPauseTime = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 0.3) totalPauseTime += gap;
  }
  const pauseRatio = Math.round((totalPauseTime / totalDuration) * 100);

  return { words_per_minute: wordsPerMinute, pause_ratio: pauseRatio };
};

module.exports = { transcribeAudio, uploadAudioToStorage, analyzeFluency };
