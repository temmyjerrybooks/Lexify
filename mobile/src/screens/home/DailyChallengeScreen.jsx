import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, Share, Platform, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { examAPI } from '../../services/api';

const SKILL_COLORS = {
  LISTENING: { bg: '#EEF2FF', text: '#3730A3', dot: '#4F46E5' },
  READING:   { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  WRITING:   { bg: '#FFF7ED', text: '#C2410C', dot: '#EA580C' },
  SPEAKING:  { bg: '#F5F3FF', text: '#5B21B6', dot: '#7C3AED' },
};

const DIFF_COLORS = { EASY: '#10B981', MEDIUM: '#F59E0B', HARD: '#EF4444' };

const XP_PER_CORRECT = 10;

// ─── Main Screen ─────────────────────────────────────────────────────────────

const DailyChallengeScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => examAPI.getDailyChallenge().then(r => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const [phase,        setPhase]        = useState('intro');   // 'intro' | 'quiz' | 'done'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers,      setAnswers]      = useState([]);         // { selected, correct_answer, is_correct }[]
  const [selected,     setSelected]     = useState(null);       // current question selection
  const [revealed,     setRevealed]     = useState(false);      // answer revealed for current Q
  const [textAnswer,   setTextAnswer]   = useState('');

  const questions = data?.questions || [];
  const today     = data?.date || new Date().toISOString().split('T')[0];
  const question  = questions[currentIndex];

  const isTextType = question && !['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN'].includes(question.question_type);
  const xpEarned  = answers.filter(a => a.is_correct).length * XP_PER_CORRECT;

  const handleSelect = (label) => {
    if (revealed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(label);
  };

  const handleReveal = () => {
    if (revealed || (!selected && !textAnswer.trim())) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const correct = question.correct_answer?.trim().toUpperCase();
    const userAns = (isTextType ? textAnswer.trim() : selected)?.toUpperCase();
    const is_correct = userAns === correct;

    if (is_correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setRevealed(true);
    setAnswers(prev => [...prev, {
      selected: isTextType ? textAnswer.trim() : selected,
      correct_answer: question.correct_answer,
      question_text: question.question_text,
      is_correct,
    }]);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('done');
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setRevealed(false);
      setTextAnswer('');
    }
  };

  const handleShare = async () => {
    const score = answers.filter(a => a.is_correct).length;
    await Share.share({
      message: `I scored ${score}/${questions.length} on today's Examify Daily Challenge and earned ${xpEarned} XP! 🔥 Try it yourself.`,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.loadingHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading today's challenge…</Text>
        </View>
      </View>
    );
  }

  if (!questions.length) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.loadingHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No challenge today</Text>
          <Text style={styles.emptySub}>Check back tomorrow!</Text>
        </View>
      </View>
    );
  }

  // ── Phase: Intro ────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#00C6A2', '#009E82']} style={styles.introGrad}>
          <SafeAreaView edges={['top']}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </SafeAreaView>

          <Animated.View entering={FadeIn.duration(400)} style={styles.introContent}>
            <Text style={styles.introIcon}>⚡</Text>
            <Text style={styles.introTag}>DAILY CHALLENGE</Text>
            <Text style={styles.introTitle}>Today's Quiz</Text>
            <Text style={styles.introDate}>{formatDate(today)}</Text>

            <View style={styles.introStatsRow}>
              <IntroStat icon="help-circle-outline" value={questions.length} label="Questions" />
              <IntroStat icon="flash-outline" value={`${questions.length * XP_PER_CORRECT} XP`} label="Max reward" />
              <IntroStat icon="time-outline" value="~3 min" label="Est. time" />
            </View>

            {/* Skill preview dots */}
            <View style={styles.skillPreview}>
              {questions.map((q, i) => {
                const cfg = SKILL_COLORS[q.skill] || SKILL_COLORS.READING;
                return (
                  <View key={i} style={[styles.skillDot, { backgroundColor: cfg.dot }]} />
                );
              })}
            </View>
            <Text style={styles.skillPreviewLabel}>
              {[...new Set(questions.map(q => q.skill))].join(' · ')}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.introFooter}>
          <Pressable onPress={() => setPhase('quiz')} style={styles.startBtn}>
            <LinearGradient colors={['#00C6A2', '#009E82']} style={styles.startBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.startBtnText}>Start Challenge</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Phase: Done ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const score     = answers.filter(a => a.is_correct).length;
    const pct       = Math.round((score / questions.length) * 100);
    const { label, color } = scoreLabel(score, questions.length);

    return (
      <View style={styles.screen}>
        <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.doneHeader}>
          <SafeAreaView edges={['top']}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.doneScroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.doneCard}>
            <Text style={styles.doneEmoji}>{scoreEmoji(score, questions.length)}</Text>
            <Text style={styles.doneTitle}>{label}</Text>
            <Text style={styles.doneScore}>{score}/{questions.length}</Text>
            <Text style={styles.doneScoreLabel}>Questions correct</Text>

            {/* XP pill */}
            <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.xpPill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.xpPillText}>⚡ +{xpEarned} XP earned</Text>
            </LinearGradient>
          </Animated.View>

          {/* Per-question breakdown */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Question Breakdown</Text>
            {answers.map((a, i) => (
              <View key={i} style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: a.is_correct ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Ionicons
                    name={a.is_correct ? 'checkmark' : 'close'}
                    size={14}
                    color={a.is_correct ? '#10B981' : '#EF4444'}
                  />
                </View>
                <Text style={styles.breakdownText} numberOfLines={2}>{a.question_text}</Text>
                {!a.is_correct && (
                  <Text style={styles.breakdownCorrect}>✓ {a.correct_answer}</Text>
                )}
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.doneActions}>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-social-outline" size={18} color="#6C47FF" />
              <Text style={styles.shareBtnText}>Share result</Text>
            </Pressable>
            <Pressable onPress={() => navigation.goBack()} style={styles.doneHomeBtn}>
              <Text style={styles.doneHomeBtnText}>Back to Home</Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Phase: Quiz ─────────────────────────────────────────────────────────────
  const cfg = SKILL_COLORS[question?.skill] || SKILL_COLORS.READING;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.quizHeader}>
        <SafeAreaView edges={['top']}>
          <View style={styles.quizHeaderRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <Text style={styles.quizHeaderLabel}>Daily Challenge</Text>
            <Text style={styles.quizHeaderCount}>{currentIndex + 1}/{questions.length}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: `${((currentIndex + (revealed ? 1 : 0)) / questions.length) * 100}%` }]}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.quizScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View key={currentIndex} entering={FadeInDown.duration(300)}>

            {/* Skill chip + difficulty */}
            <View style={styles.chipRow}>
              <View style={[styles.skillChip, { backgroundColor: cfg.bg }]}>
                <View style={[styles.skillChipDot, { backgroundColor: cfg.dot }]} />
                <Text style={[styles.skillChipText, { color: cfg.text }]}>{question.skill}</Text>
              </View>
              {question.difficulty && (
                <View style={[styles.diffChip, { backgroundColor: (DIFF_COLORS[question.difficulty] || '#9299B8') + '18' }]}>
                  <Text style={[styles.diffChipText, { color: DIFF_COLORS[question.difficulty] || '#9299B8' }]}>
                    {question.difficulty}
                  </Text>
                </View>
              )}
            </View>

            {/* Question */}
            <Text style={styles.questionText}>{question.question_text}</Text>

            {/* MCQ options */}
            {!isTextType && question.options?.length > 0 && (
              <View style={styles.optionsList}>
                {question.options.map((opt) => {
                  const label = opt.label || opt;
                  const text  = opt.text  || opt;
                  const isSelected = selected === label;
                  const isCorrectOpt = revealed && question.correct_answer?.toUpperCase() === label?.toUpperCase();
                  const isWrongSel  = revealed && isSelected && !isCorrectOpt;

                  let bg      = '#fff';
                  let border  = '#E2E4F0';
                  let textCol = '#1A1B2F';

                  if (isCorrectOpt) { bg = '#D1FAE5'; border = '#10B981'; textCol = '#065F46'; }
                  else if (isWrongSel) { bg = '#FEE2E2'; border = '#EF4444'; textCol = '#991B1B'; }
                  else if (isSelected) { bg = '#EEF0FF'; border = '#6C47FF'; textCol = '#4338CA'; }

                  return (
                    <Pressable
                      key={label}
                      onPress={() => handleSelect(label)}
                      style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                      disabled={revealed}
                    >
                      <View style={[styles.optionLabel, { borderColor: border, backgroundColor: isSelected || isCorrectOpt ? border : 'transparent' }]}>
                        <Text style={[styles.optionLabelText, { color: isSelected || isCorrectOpt ? '#fff' : '#9299B8' }]}>{label}</Text>
                      </View>
                      <Text style={[styles.optionText, { color: textCol }]}>{text}</Text>
                      {isCorrectOpt && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                      {isWrongSel   && <Ionicons name="close-circle"     size={18} color="#EF4444" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* TRUE_FALSE_NOT_GIVEN without options array */}
            {!isTextType && !question.options?.length && (
              <View style={styles.optionsList}>
                {['TRUE', 'FALSE', 'NOT GIVEN'].map((label) => {
                  const isSelected  = selected === label;
                  const isCorrectOpt = revealed && question.correct_answer?.toUpperCase() === label;
                  const isWrongSel   = revealed && isSelected && !isCorrectOpt;

                  let bg = '#fff', border = '#E2E4F0', textCol = '#1A1B2F';
                  if (isCorrectOpt) { bg = '#D1FAE5'; border = '#10B981'; textCol = '#065F46'; }
                  else if (isWrongSel) { bg = '#FEE2E2'; border = '#EF4444'; textCol = '#991B1B'; }
                  else if (isSelected) { bg = '#EEF0FF'; border = '#6C47FF'; textCol = '#4338CA'; }

                  return (
                    <Pressable
                      key={label}
                      onPress={() => handleSelect(label)}
                      style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                      disabled={revealed}
                    >
                      <Text style={[styles.optionText, { color: textCol, fontWeight: '600' }]}>{label}</Text>
                      {isCorrectOpt && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                      {isWrongSel   && <Ionicons name="close-circle"     size={18} color="#EF4444" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Text-based types */}
            {isTextType && (
              <View style={styles.textAnswerWrap}>
                <TextInput
                  style={[
                    styles.textInput,
                    revealed && { borderColor: answers.at(-1)?.is_correct ? '#10B981' : '#EF4444' },
                  ]}
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  placeholder="Type your answer…"
                  placeholderTextColor="#C4C9DF"
                  editable={!revealed}
                  returnKeyType="done"
                  onSubmitEditing={handleReveal}
                />
                {revealed && (
                  <Animated.View entering={FadeInDown.duration(250)} style={styles.textReveal}>
                    <Text style={styles.textRevealLabel}>Correct answer</Text>
                    <Text style={styles.textRevealAnswer}>{question.correct_answer}</Text>
                  </Animated.View>
                )}
              </View>
            )}

            {/* Result feedback banner */}
            {revealed && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                  styles.feedbackBanner,
                  { backgroundColor: answers.at(-1)?.is_correct ? '#D1FAE5' : '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={answers.at(-1)?.is_correct ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={answers.at(-1)?.is_correct ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.feedbackText, { color: answers.at(-1)?.is_correct ? '#065F46' : '#991B1B' }]}>
                  {answers.at(-1)?.is_correct ? 'Correct! +10 XP' : `Incorrect — the answer is ${question.correct_answer}`}
                </Text>
              </Animated.View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {!revealed ? (
          <Pressable
            onPress={handleReveal}
            disabled={!selected && !textAnswer.trim()}
            style={[styles.ctaBtn, (!selected && !textAnswer.trim()) && styles.ctaBtnDisabled]}
          >
            <Text style={styles.ctaBtnText}>Check Answer</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleNext} style={styles.ctaBtn}>
            <Text style={styles.ctaBtnText}>
              {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const IntroStat = ({ icon, value, label }) => (
  <View style={styles.introStat}>
    <View style={styles.introStatIcon}>
      <Ionicons name={icon} size={20} color="#fff" />
    </View>
    <Text style={styles.introStatValue}>{value}</Text>
    <Text style={styles.introStatLabel}>{label}</Text>
  </View>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

const scoreLabel = (score, total) => {
  const pct = score / total;
  if (pct === 1)   return { label: 'Perfect score!',     color: '#10B981' };
  if (pct >= 0.8)  return { label: 'Excellent work!',    color: '#10B981' };
  if (pct >= 0.6)  return { label: 'Good effort!',       color: '#F59E0B' };
  if (pct >= 0.4)  return { label: 'Keep practising!',   color: '#F59E0B' };
  return               { label: 'Better luck tomorrow!', color: '#EF4444' };
};

const scoreEmoji = (score, total) => {
  const pct = score / total;
  if (pct === 1)  return '🏆';
  if (pct >= 0.8) return '🎉';
  if (pct >= 0.6) return '👍';
  return '💪';
};

export default DailyChallengeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  flex:   { flex: 1 },

  loadingHeader: { backgroundColor: '#1A0A3E', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn:       { padding: 4 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText:   { fontSize: 15, color: '#9299B8' },
  emptyIcon:     { fontSize: 44 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: '#1A1B2F' },
  emptySub:      { fontSize: 14, color: '#9299B8' },

  // ── Intro ──
  introGrad: { flex: 1, paddingHorizontal: 24, paddingTop: 0 },
  introContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 40 },
  introIcon:  { fontSize: 52, marginBottom: 8 },
  introTag:   { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  introTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },
  introDate:  { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },

  introStatsRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  introStat:     { alignItems: 'center', gap: 6 },
  introStatIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  introStatValue:{ fontSize: 16, fontWeight: '800', color: '#fff' },
  introStatLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  skillPreview:      { flexDirection: 'row', gap: 6, marginTop: 20 },
  skillDot:          { width: 10, height: 10, borderRadius: 5 },
  skillPreviewLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.5 },

  introFooter: { padding: 24, paddingBottom: 40, backgroundColor: '#F5F6FA' },
  startBtn:    { borderRadius: 18, overflow: 'hidden' },
  startBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  startBtnText:{ fontSize: 17, fontWeight: '800', color: '#fff' },

  // ── Quiz header ──
  quizHeader:    { paddingHorizontal: 16, paddingBottom: 16 },
  quizHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  quizHeaderLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  quizHeaderCount: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#00C6A2', borderRadius: 2 },

  quizScroll: { padding: 16, paddingBottom: 120, gap: 16 },

  chipRow:       { flexDirection: 'row', gap: 8, marginBottom: 4 },
  skillChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  skillChipDot:  { width: 6, height: 6, borderRadius: 3 },
  skillChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  diffChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  diffChipText:  { fontSize: 12, fontWeight: '700' },

  questionText: { fontSize: 17, fontWeight: '700', color: '#1A1B2F', lineHeight: 26 },

  optionsList: { gap: 10, marginTop: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
    backgroundColor: '#fff', borderColor: '#E2E4F0',
  },
  optionLabel: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionLabelText: { fontSize: 12, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 15, color: '#1A1B2F' },

  textAnswerWrap: { gap: 10, marginTop: 4 },
  textInput: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E2E4F0', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#1A1B2F',
  },
  textReveal:       { backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12 },
  textRevealLabel:  { fontSize: 11, fontWeight: '700', color: '#065F46', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  textRevealAnswer: { fontSize: 16, fontWeight: '700', color: '#065F46' },

  feedbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, marginTop: 4 },
  feedbackText:   { flex: 1, fontSize: 14, fontWeight: '600' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#F0F1F8' },
  ctaBtn:         { backgroundColor: '#1A1B2F', borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  ctaBtnDisabled: { backgroundColor: '#C4C9DF' },
  ctaBtnText:     { fontSize: 16, fontWeight: '800', color: '#fff' },

  // ── Done ──
  doneHeader: { paddingHorizontal: 16, paddingBottom: 20 },
  doneScroll: { padding: 16, gap: 14 },

  doneCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  doneEmoji:      { fontSize: 52, marginBottom: 4 },
  doneTitle:      { fontSize: 22, fontWeight: '800', color: '#1A1B2F' },
  doneScore:      { fontSize: 52, fontWeight: '900', color: '#1A1B2F', lineHeight: 60 },
  doneScoreLabel: { fontSize: 14, color: '#9299B8', marginBottom: 8 },
  xpPill:         { flexDirection: 'row', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  xpPillText:     { fontSize: 15, fontWeight: '800', color: '#fff' },

  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: '#1A1B2F', marginBottom: 4 },
  breakdownRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  breakdownIcon:  { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  breakdownText:  { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  breakdownCorrect: { fontSize: 12, fontWeight: '700', color: '#10B981', flexShrink: 0 },

  doneActions: { gap: 10 },
  shareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: '#E2E4F0' },
  shareBtnText:{ fontSize: 15, fontWeight: '700', color: '#6C47FF' },
  doneHomeBtn: { backgroundColor: '#1A1B2F', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  doneHomeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
