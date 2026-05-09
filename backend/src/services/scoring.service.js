const supabase = require('../config/supabase');

// ─── IELTS Raw Score → Band Conversion Tables ───────────────────────────────
// Source: Official IELTS Score Conversion Tables (Cambridge Assessment English)

const IELTS_LISTENING_TABLE = {
  39: 9.0, 38: 8.5, 37: 8.0, 36: 7.5, 35: 7.0, 34: 6.5, 33: 6.5, 32: 6.0,
  31: 6.0, 30: 5.5, 29: 5.5, 28: 5.0, 27: 5.0, 26: 5.0, 25: 4.5, 24: 4.5,
  23: 4.0, 22: 4.0, 21: 3.5, 20: 3.5, 19: 3.0, 18: 3.0, 17: 3.0, 16: 2.5,
  15: 2.5, 14: 2.5, 13: 2.0, 12: 2.0, 11: 2.0, 10: 1.5, 9: 1.5, 8: 1.5,
  7: 1.5, 6: 1.0, 5: 1.0, 4: 1.0, 3: 1.0, 2: 1.0, 1: 1.0, 0: 0,
};

const IELTS_READING_ACADEMIC_TABLE = {
  40: 9.0, 39: 9.0, 38: 8.5, 37: 8.5, 36: 8.0, 35: 7.5, 34: 7.0, 33: 6.5,
  32: 6.5, 31: 6.0, 30: 6.0, 29: 5.5, 28: 5.5, 27: 5.0, 26: 5.0, 25: 5.0,
  24: 4.5, 23: 4.5, 22: 4.0, 21: 4.0, 20: 4.0, 19: 3.5, 18: 3.5, 17: 3.5,
  16: 3.0, 15: 3.0, 14: 2.5, 13: 2.5, 12: 2.0, 11: 2.0, 10: 2.0, 9: 1.5,
  8: 1.5, 7: 1.5, 6: 1.0, 5: 1.0, 4: 1.0, 3: 1.0, 2: 1.0, 1: 1.0, 0: 0,
};

// TEF Score → CEFR Level Mapping
const TEF_TO_CEFR = [
  { minScore: 549, level: 'C2' },
  { minScore: 499, level: 'C1' },
  { minScore: 399, level: 'B2' },
  { minScore: 299, level: 'B1' },
  { minScore: 199, level: 'A2' },
  { minScore: 100, level: 'A1' },
  { minScore: 0, level: 'Below A1' },
];

const convertRawToIELTSBand = (rawScore, skill) => {
  const table = skill === 'LISTENING' ? IELTS_LISTENING_TABLE : IELTS_READING_ACADEMIC_TABLE;
  const clampedScore = Math.max(0, Math.min(rawScore, Object.keys(table).length - 1));
  return table[clampedScore] ?? 1.0;
};

const roundToHalfBand = (score) => Math.round(score * 2) / 2;

const convertToOverallIELTSBand = (scores) => {
  const { reading, listening, writing, speaking } = scores;
  const available = [reading, listening, writing, speaking].filter(s => s != null);
  if (!available.length) return null;
  const avg = available.reduce((a, b) => a + b, 0) / available.length;
  return roundToHalfBand(avg);
};

const convertTEFScoreToCEFR = (totalScore) => {
  for (const { minScore, level } of TEF_TO_CEFR) {
    if (totalScore >= minScore) return level;
  }
  return 'Below A1';
};

// ─── Main Score Calculator ───────────────────────────────────────────────────
// Aggregates all answers from a session and computes the final result

const calculateSessionScore = async (sessionId, examId) => {
  const { data: exam } = await supabase
    .from('exams')
    .select('exam_type')
    .eq('id', examId)
    .single();

  const { data: answers } = await supabase
    .from('user_answers')
    .select(`
      question_id, is_correct, points_earned,
      questions (skill, question_type, points, tags)
    `)
    .eq('session_id', sessionId);

  if (!answers?.length) {
    return {
      overall_score: 0,
      band_score: null,
      reading_score: null,
      listening_score: null,
      writing_score: null,
      speaking_score: null,
      score_breakdown: {},
      weak_areas: [],
      strong_areas: [],
    };
  }

  // Group answers by skill
  const bySkill = {};
  const tagStats = {};

  for (const answer of answers) {
    const skill = answer.questions?.skill;
    if (!skill) continue;

    if (!bySkill[skill]) bySkill[skill] = { correct: 0, total: 0, totalPoints: 0, earnedPoints: 0 };

    bySkill[skill].total++;
    bySkill[skill].totalPoints += answer.questions?.points || 1;

    if (answer.is_correct) {
      bySkill[skill].correct++;
      bySkill[skill].earnedPoints += answer.points_earned || 0;
    }

    // Track performance by topic tag for weak area analysis
    for (const tag of (answer.questions?.tags || [])) {
      if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
      tagStats[tag].total++;
      if (answer.is_correct) tagStats[tag].correct++;
    }
  }

  const scores = {};
  const breakdown = {};

  if (exam.exam_type === 'IELTS') {
    for (const [skill, stat] of Object.entries(bySkill)) {
      if (['READING', 'LISTENING'].includes(skill)) {
        const band = convertRawToIELTSBand(stat.earnedPoints, skill);
        scores[skill.toLowerCase()] = band;
        breakdown[skill] = { raw: stat.earnedPoints, total: stat.totalPoints, band };
      }
    }

    // Writing and speaking come from AI feedback (async) — use placeholder if not ready
    const { data: aiFeedback } = await supabase
      .from('ai_feedback')
      .select('skill, overall_score')
      .eq('session_id', sessionId)
      .eq('status', 'COMPLETED');

    for (const fb of (aiFeedback || [])) {
      scores[fb.skill.toLowerCase()] = fb.overall_score;
      breakdown[fb.skill] = { band: fb.overall_score, source: 'ai' };
    }

    const overallBand = convertToOverallIELTSBand({
      reading: scores.reading,
      listening: scores.listening,
      writing: scores.writing,
      speaking: scores.speaking,
    });

    // Identify weak areas (tags with < 60% accuracy) and strong areas (> 80%)
    const weakAreas = Object.entries(tagStats)
      .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.6)
      .map(([tag]) => tag);

    const strongAreas = Object.entries(tagStats)
      .filter(([, s]) => s.total >= 2 && s.correct / s.total >= 0.8)
      .map(([tag]) => tag);

    return {
      overall_score: overallBand || 0,
      band_score: overallBand,
      reading_score: scores.reading || null,
      listening_score: scores.listening || null,
      writing_score: scores.writing || null,
      speaking_score: scores.speaking || null,
      score_breakdown: breakdown,
      weak_areas: weakAreas,
      strong_areas: strongAreas,
    };
  }

  // TEF/TCF scoring (percentage-based, converted to 0-450)
  if (['TEF', 'TCF'].includes(exam.exam_type)) {
    let totalEarned = 0;
    let totalPossible = 0;

    for (const stat of Object.values(bySkill)) {
      totalEarned += stat.earnedPoints;
      totalPossible += stat.totalPoints;
    }

    const percentageScore = totalPossible > 0 ? (totalEarned / totalPossible) : 0;
    const scoreSur450 = Math.round(percentageScore * 450);
    const cefrLevel = convertTEFScoreToCEFR(scoreSur450);

    return {
      overall_score: scoreSur450,
      band_score: null,
      reading_score: null,
      listening_score: null,
      writing_score: null,
      speaking_score: null,
      score_breakdown: { ...breakdown, cefr_level: cefrLevel },
      weak_areas: Object.entries(tagStats)
        .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.6)
        .map(([tag]) => tag),
      strong_areas: Object.entries(tagStats)
        .filter(([, s]) => s.total >= 2 && s.correct / s.total >= 0.8)
        .map(([tag]) => tag),
    };
  }

  return { overall_score: 0, score_breakdown: {}, weak_areas: [], strong_areas: [] };
};

module.exports = { calculateSessionScore, convertRawToIELTSBand, convertToOverallIELTSBand, convertTEFScoreToCEFR };
