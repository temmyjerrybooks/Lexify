const { getClient, markRateLimited, keyCount } = require('../utils/groqRotator');
const logger = require('../utils/logger');

// Shared helper — rotates Groq keys automatically on 429
const ask = async (systemPrompt, userPrompt, maxTokens = 1500) => {
  let lastErr;

  for (let attempt = 0; attempt < keyCount + 1; attempt++) {
    const { client, keyIndex } = getClient();
    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      });

      const text = response.choices[0].message.content.trim();
      try {
        return {
          parsed: JSON.parse(text),
          tokens_used: response.usage?.total_tokens || 0,
          ai_model: 'llama-3.3-70b-versatile',
        };
      } catch {
        logger.error('Groq response was not valid JSON:', text);
        throw new Error('AI returned an invalid response. Please try again.');
      }
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '60') * 1000;
        logger.warn(`Groq key ${keyIndex + 1}/${keyCount} rate-limited — switching key (retry-after ${retryAfter / 1000}s)`);
        markRateLimited(keyIndex, retryAfter);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('All Groq API keys are currently rate-limited. Please try again shortly.');
};

// ─── IELTS Writing Scoring ──────────────────────────────────────────────────

const scoreIELTSWriting = async ({ task_number, question_text, user_answer }) => {
  const isTask1 = task_number === 1;
  const criteria = isTask1
    ? ['task_achievement', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy']
    : ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range_and_accuracy'];

  const systemPrompt = `You are an expert IELTS examiner with 15+ years of experience marking IELTS Writing papers.
You have deep knowledge of the official IELTS Writing Band Descriptors published by Cambridge Assessment English.
Your scoring must be accurate, consistent, and match real IELTS examiner standards.
Always respond with valid JSON only — no prose, no markdown.`;

  const userPrompt = `Score this IELTS Writing Task ${task_number} response.

TASK PROMPT:
${question_text}

STUDENT'S ANSWER:
${user_answer}

Score each criterion from 1.0 to 9.0 in 0.5 increments following the official IELTS Band Descriptors.

Return ONLY this JSON structure:
{
  "criteria_scores": {
    ${criteria.map(c => `"${c}": <number>`).join(',\n    ')}
  },
  "overall_score": <average of criteria, rounded to nearest 0.5>,
  "word_count": <count words in student answer>,
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "detailed_feedback": "<2-3 paragraph detailed examiner feedback explaining the scores>",
  "model_answer_excerpt": "<First 150 words of what a Band 7+ answer might look like for this task>"
}`;

  const { parsed, tokens_used, ai_model } = await ask(systemPrompt, userPrompt, 1500);
  return { ...parsed, ai_model, tokens_used };
};

// ─── IELTS Speaking Scoring ─────────────────────────────────────────────────

const scoreIELTSSpeaking = async ({ transcript, question_text, part_number, fluency_stats }) => {
  const systemPrompt = `You are a certified IELTS Speaking examiner trained by Cambridge Assessment English.
You score transcripts according to the official IELTS Speaking Band Descriptors.
Respond with valid JSON only.`;

  const userPrompt = `Score this IELTS Speaking Part ${part_number} response.

QUESTION/PROMPT:
${question_text}

TRANSCRIPT OF STUDENT'S SPEECH:
${transcript}

FLUENCY STATS (from audio analysis):
- Words per minute: ${fluency_stats?.words_per_minute || 'unknown'}
- Pause ratio: ${fluency_stats?.pause_ratio || 'unknown'}%

Score based on how the spoken delivery would sound given the vocabulary and grammar visible in the transcript.

Return ONLY this JSON:
{
  "criteria_scores": {
    "fluency_and_coherence": <1.0-9.0>,
    "lexical_resource": <1.0-9.0>,
    "grammatical_range_and_accuracy": <1.0-9.0>,
    "pronunciation": <1.0-9.0>
  },
  "overall_score": <average rounded to nearest 0.5>,
  "estimated_word_count": <count>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "detailed_feedback": "<1-2 paragraphs of examiner feedback>",
  "vocabulary_highlights": ["<advanced word/phrase the student used well>"],
  "grammar_errors": ["<specific grammar error>"]
}`;

  const { parsed, tokens_used, ai_model } = await ask(systemPrompt, userPrompt, 1200);
  return { ...parsed, ai_model, tokens_used };
};

// ─── TEF/TCF Writing Scoring ────────────────────────────────────────────────

const scoreTEFWriting = async ({ exam_type, task_number, question_text, user_answer }) => {
  const systemPrompt = `You are an expert ${exam_type} examiner, fully trained in the official ${exam_type} scoring rubrics.
The TEF Canada Expression Écrite is scored from 0 to 450 points across criteria including:
- Réalisation de la tâche (task completion)
- Cohérence et cohésion (coherence)
- Vocabulaire (vocabulary)
- Morphosyntaxe (grammar)
Respond with valid JSON only.`;

  const userPrompt = `Évaluez cette réponse ${exam_type} Expression Écrite.

CONSIGNE:
${question_text}

RÉPONSE DE L'ÉTUDIANT:
${user_answer}

Return ONLY this JSON:
{
  "criteria_scores": {
    "realisation_tache": <0-100>,
    "coherence_cohesion": <0-100>,
    "vocabulaire": <0-100>,
    "morphosyntaxe": <0-100>
  },
  "score_sur_450": <total out of 450>,
  "niveau_cefr": "<A1|A2|B1|B2|C1|C2>",
  "points_forts": ["<point fort 1>", "<point fort 2>"],
  "points_ameliorer": ["<amélioration 1>", "<amélioration 2>"],
  "commentaires_detailles": "<2-3 paragraphes de feedback>",
  "exemple_bonne_reponse": "<début d'une réponse de niveau C1>"
}`;

  const { parsed, tokens_used, ai_model } = await ask(systemPrompt, userPrompt, 1200);
  return { ...parsed, ai_model, tokens_used };
};

// ─── AI Question Generator ──────────────────────────────────────────────────

const generateQuestions = async ({ exam_type, skill, difficulty, topic, count = 5 }) => {
  const systemPrompt = `You are an expert ${exam_type} question writer.
You create realistic, exam-style practice questions that match the exact format and difficulty of real ${exam_type} ${skill} questions.
Respond with valid JSON only.`;

  const userPrompt = `Generate ${count} ${exam_type} ${skill} practice questions.

Difficulty: ${difficulty}
Topic/Focus area: ${topic || 'general'}

Return ONLY a JSON object with a "questions" array:
{
  "questions": [
    {
      "question_type": "<MULTIPLE_CHOICE|FILL_IN_BLANK|TRUE_FALSE_NOT_GIVEN|SHORT_ANSWER|ESSAY>",
      "question_text": "<full question text>",
      "options": [{"label": "A", "text": "<option text>"}],
      "correct_answer": "<answer>",
      "answer_explanation": "<why this is correct>",
      "difficulty": "${difficulty}",
      "tags": ["<topic tag>"]
    }
  ]
}`;

  const { parsed } = await ask(systemPrompt, userPrompt, 3000);
  return parsed.questions || parsed;
};

// ─── AI Tutor Chat ───────────────────────────────────────────────────────────
// FIX [B12]: Previously used direct recursion on 429 with no depth limit, which
// could cause a stack overflow when all keys are simultaneously rate-limited.
// Now uses the same bounded retry loop as the `ask()` helper via a dedicated loop.
const chatWithTutor = async ({ exam_type, messages, user_context }) => {
  let lastErr;

  for (let attempt = 0; attempt < keyCount + 1; attempt++) {
    const { client, keyIndex } = getClient();
    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `You are an expert ${exam_type} preparation tutor.
You help students understand exam formats, improve their language skills, and develop exam strategies.
User context: target exam ${exam_type}, studying for ${user_context?.exam_date || 'upcoming exam'}.
Be encouraging, specific, and practical. Ask follow-up questions to understand the student's challenges.`,
          },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ],
      });
      return {
        content: response.choices[0].message.content,
        tokens_used: response.usage?.total_tokens || 0,
      };
    } catch (err) {
      if (err.status === 429) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '60') * 1000;
        logger.warn(`Groq tutor key ${keyIndex + 1}/${keyCount} rate-limited — switching key`);
        markRateLimited(keyIndex, retryAfter);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('All Groq API keys are currently rate-limited. Please try again shortly.');
};

module.exports = {
  scoreIELTSWriting,
  scoreIELTSSpeaking,
  scoreTEFWriting,
  generateQuestions,
  chatWithTutor,
};
