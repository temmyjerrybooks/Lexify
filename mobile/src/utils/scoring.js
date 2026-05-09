// Client-side scoring utilities

// IELTS Band → CEFR level
export const bandToCEFR = (band) => {
  if (band >= 8.5) return 'C2';
  if (band >= 7.0) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4.0) return 'B1';
  if (band >= 3.0) return 'A2';
  return 'A1';
};

// Format a band score for display: 7 → "7.0", 7.5 → "7.5"
export const formatBand = (score) => {
  if (score == null) return '—';
  return Number(score).toFixed(1);
};

// Estimate time to achieve a target band based on current band
export const estimateStudyWeeks = (currentBand, targetBand) => {
  if (!currentBand || !targetBand || currentBand >= targetBand) return 0;
  const gap = targetBand - currentBand;
  // ~8-12 weeks per 0.5 band increase with consistent daily practice
  return Math.round((gap / 0.5) * 10);
};

// Convert raw IELTS score to percentage for progress bars
export const bandToPercent = (band) => {
  if (!band) return 0;
  return Math.min(100, (band / 9) * 100);
};

// TEF score (0-450) → percentage
export const tefScoreToPercent = (score) => {
  if (!score) return 0;
  return Math.min(100, (score / 450) * 100);
};

// Get motivational message based on score improvement
export const getImprovementMessage = (previousBand, currentBand) => {
  if (!previousBand || !currentBand) return null;
  const diff = currentBand - previousBand;
  if (diff >= 1.0) return '🚀 Amazing improvement! Keep this momentum!';
  if (diff >= 0.5) return '📈 Great progress! You\'re on track!';
  if (diff === 0) return '💪 Consistent score. Focus on your weak areas!';
  if (diff < 0) return '📚 Don\'t worry — variation is normal. Keep practicing!';
};
