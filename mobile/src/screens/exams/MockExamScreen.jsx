import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, BackHandler, AppState,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut, SlideInRight, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  startExamSession, submitAnswer, completeExamSession,
  setCurrentExam, advanceQuestion, goToPreviousQuestion,
  setTimeRemaining, tickTimer, recordLocalAnswer,
  selectCurrentQuestion, selectCurrentSection, selectExamProgress,
} from '../../store/slices/examSlice';
import { examAPI, aiAPI } from '../../services/api';

import QuestionCard from '../../components/exam/QuestionCard';
import AudioPlayer from '../../components/exam/AudioPlayer';
import AudioRecorder from '../../components/exam/AudioRecorder';
import WritingEditor from '../../components/exam/WritingEditor';

const SKILL_COLORS = {
  LISTENING: { bg: '#EEF2FF', text: '#3730A3', dot: '#4F46E5' },
  READING:   { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  WRITING:   { bg: '#FFF7ED', text: '#C2410C', dot: '#EA580C' },
  SPEAKING:  { bg: '#F5F3FF', text: '#5B21B6', dot: '#7C3AED' },
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const shuffleExamQuestions = (exam) => ({
  ...exam,
  exam_sections: exam.exam_sections.map((section) => ({
    ...section,
    questions: ['WRITING', 'SPEAKING'].includes(section.skill)
      ? section.questions
      : shuffle(section.questions),
  })),
});

const MockExamScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const { examId } = route.params;
  const dispatch   = useDispatch();

  const {
    currentSession, currentSectionIndex, currentQuestionIndex,
    answers, timeRemaining, isSubmitting,
  } = useSelector(s => s.exam);
  const currentQuestion = useSelector(selectCurrentQuestion);
  const currentSection  = useSelector(selectCurrentSection);
  const progress        = useSelector(selectExamProgress);

  // Hide tab bar for full-screen exam experience
  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const [selectedAnswer, setSelectedAnswer]   = useState(null);
  const [writingText, setWritingText]         = useState('');
  const [audioRecording, setAudioRecording]   = useState(null);
  const [isStarting, setIsStarting]           = useState(true);
  const [sectionBreak, setSectionBreak]       = useState(null); // { skill, duration }
  const timerRef         = useRef(null);
  const questionStart    = useRef(Date.now());
  const appStateRef      = useRef(AppState.currentState);
  const prevSectionIndex = useRef(0);

  // Progress bar animation
  const progressAnim = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const { data: examData } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examAPI.getDetails(examId).then(r => r.data),
  });

  useEffect(() => {
    if (!examData?.exam || !isStarting) return;
    const init = async () => {
      try {
        const shuffled = shuffleExamQuestions(examData.exam);
        dispatch(setCurrentExam(shuffled));
        await dispatch(startExamSession({ examId })).unwrap();
        const firstSection = shuffled.exam_sections[0];
        dispatch(setTimeRemaining(firstSection.duration_minutes * 60));
        setIsStarting(false);
      } catch {
        Alert.alert('Error', 'Could not start exam. Please try again.');
      }
    };
    init();
  }, [examData]);

  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 400 });
  }, [progress]);

  // Show section break card when section changes
  useEffect(() => {
    if (isStarting) return;
    if (currentSectionIndex !== prevSectionIndex.current) {
      const section = examData?.exam?.exam_sections[currentSectionIndex];
      if (section) {
        setSectionBreak({ skill: section.skill, duration: section.duration_minutes });
      }
      prevSectionIndex.current = currentSectionIndex;
    }
  }, [currentSectionIndex, isStarting]);

  // App state / background handling
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current === 'active' && next !== 'active') {
        clearInterval(timerRef.current);
        if (currentSession?.session_id) {
          examAPI.pauseSession(currentSession.session_id, {
            current_question_index: currentQuestionIndex,
            snapshot: answers,
          }).catch(() => {});
        }
      } else if (appStateRef.current !== 'active' && next === 'active') {
        startTimer();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [currentSession, answers, currentQuestionIndex]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => dispatch(tickTimer()), 1000);
  }, [dispatch]);

  useEffect(() => {
    if (!isStarting && timeRemaining > 0) startTimer();
    return () => clearInterval(timerRef.current);
  }, [isStarting, startTimer]);

  useEffect(() => {
    if (timeRemaining === 0 && !isStarting) handleMoveNext(true);
  }, [timeRemaining]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // FIX [M9c]: If the section-break overlay is showing, dismiss it first
      // instead of immediately surfacing the exit-exam confirmation dialog.
      if (sectionBreak) {
        setSectionBreak(null);
        return true;
      }
      confirmExit();
      return true;
    });
    return () => sub.remove();
  }, [sectionBreak]);

  const confirmExit = () => {
    Alert.alert('Exit Exam?', 'Your progress will be saved and you can resume later.', [
      { text: 'Continue Exam', style: 'cancel' },
      { text: 'Exit & Save', style: 'destructive', onPress: handleExitAndSave },
    ]);
  };

  const handleExitAndSave = async () => {
    clearInterval(timerRef.current);
    if (currentSession?.session_id) {
      await examAPI.pauseSession(currentSession.session_id, {
        current_question_index: currentQuestionIndex,
        snapshot: answers,
      });
    }
    navigation.goBack();
  };

  const handleAnswerSelect = useCallback((answer) => {
    setSelectedAnswer(answer);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleMoveNext = useCallback(async (forced = false) => {
    if (!currentQuestion || !currentSession) return;
    const timeSpent = Math.floor((Date.now() - questionStart.current) / 1000);
    const answer    = selectedAnswer || writingText || audioRecording;

    dispatch(recordLocalAnswer({ questionId: currentQuestion.id, answer, timeSpent }));

    if (answer !== null && answer !== undefined) {
      dispatch(submitAnswer({
        sessionId: currentSession.session_id,
        questionId: currentQuestion.id,
        answerText: typeof answer === 'string' ? answer : null,
        answerOptions: Array.isArray(answer) ? answer : (typeof answer === 'string' && answer.length === 1 ? [answer] : null),
        timeSpentSeconds: timeSpent,
      }));
    }

    // FIX [M9a]: Compute isSpeaking inside the callback — the outer render-level
    // variable is not in the deps array and would be stale across re-renders.
    const isCurrentQuestionSpeaking = ['SPEAKING_RESPONSE'].includes(currentQuestion.question_type);
    if (isCurrentQuestionSpeaking && audioRecording?.uri) {
      aiAPI.scoreSpeaking(audioRecording, {
        session_id: currentSession.session_id,
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        part_number: currentSectionIndex + 1,
      }).catch(() => {});
    }

    const isLastQuestion = currentQuestionIndex >= (currentSection?.questions?.length || 0) - 1;
    const isLastSection  = currentSectionIndex >= (examData?.exam?.exam_sections?.length || 0) - 1;

    if (isLastQuestion && isLastSection) {
      await handleCompleteExam();
    } else {
      if (isLastQuestion) {
        const nextSection = examData?.exam?.exam_sections[currentSectionIndex + 1];
        if (nextSection) dispatch(setTimeRemaining(nextSection.duration_minutes * 60));
      }
      dispatch(advanceQuestion());
      setSelectedAnswer(null);
      setWritingText('');
      setAudioRecording(null);
      questionStart.current = Date.now();
    }
  }, [currentQuestion, currentSession, selectedAnswer, writingText, audioRecording, currentQuestionIndex, currentSectionIndex]);

  const handleCompleteExam = async () => {
    clearInterval(timerRef.current);
    try {
      const result = await dispatch(completeExamSession(currentSession.session_id)).unwrap();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Results', { resultId: result.result_id, sessionId: currentSession.session_id });
    } catch {
      Alert.alert('Error', 'Could not submit exam. Please try again.');
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (isStarting) {
    return (
      <View style={styles.loadScreen}>
        <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeIn.duration(500)} style={styles.loadContent}>
          <Text style={styles.loadEmoji}>📝</Text>
          <Text style={styles.loadTitle}>Preparing Your Exam</Text>
          <Text style={styles.loadSub}>Shuffling questions and loading content...</Text>
          <View style={styles.loadDots}>
            {[0, 1, 2].map(i => <LoadDot key={i} delay={i * 200} />)}
          </View>
        </Animated.View>
      </View>
    );
  }

  // FIX [M9b]: Return a loading indicator instead of null (blank screen)
  // while the first question is being loaded from the Redux store.
  if (!currentQuestion) {
    return (
      <View style={styles.loadScreen}>
        <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={StyleSheet.absoluteFill} />
        <Animated.View entering={FadeIn.duration(500)} style={styles.loadContent}>
          <Text style={styles.loadEmoji}>📝</Text>
          <Text style={styles.loadTitle}>Loading Question</Text>
          <View style={styles.loadDots}>
            {[0, 1, 2].map(i => <LoadDot key={i} delay={i * 200} />)}
          </View>
        </Animated.View>
      </View>
    );
  }

  const isWriting   = ['ESSAY'].includes(currentQuestion.question_type);
  const isSpeaking  = ['SPEAKING_RESPONSE'].includes(currentQuestion.question_type);
  const isListening = currentSection?.skill === 'LISTENING' && currentSection?.audio_url;
  const canProceed  = isWriting ? writingText.length > 50 : isSpeaking ? !!audioRecording : !!selectedAnswer;

  const skillCfg    = SKILL_COLORS[currentSection?.skill] || SKILL_COLORS.READING;
  const totalQ      = currentSection?.questions?.length || 0;
  const isLowTime   = timeRemaining < 120;
  const minutes     = Math.floor(timeRemaining / 60);
  const seconds     = timeRemaining % 60;
  const timeStr     = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={confirmExit} style={styles.exitBtn} hitSlop={8}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={[styles.skillChip, { backgroundColor: skillCfg.bg }]}>
              <View style={[styles.skillDot, { backgroundColor: skillCfg.dot }]} />
              <Text style={[styles.skillLabel, { color: skillCfg.text }]}>{currentSection?.skill}</Text>
            </View>
            <Text style={styles.questionCounter}>
              {currentQuestionIndex + 1} / {totalQ}
            </Text>
          </View>

          <View style={[styles.timerChip, isLowTime && styles.timerChipRed]}>
            <Ionicons name="time-outline" size={14} color={isLowTime ? '#EF4444' : '#6B7280'} />
            <Text style={[styles.timerText, isLowTime && styles.timerTextRed]}>{timeStr}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle, { backgroundColor: skillCfg.dot }]} />
        </View>
      </SafeAreaView>

      {/* ── Section break overlay ── */}
      {sectionBreak && (
        <SectionBreakCard
          skill={sectionBreak.skill}
          duration={sectionBreak.duration}
          onStart={() => setSectionBreak(null)}
        />
      )}

      {/* ── Body ── */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Animated.View key={`${currentSectionIndex}-${currentQuestionIndex}`} entering={SlideInRight.duration(280)}>

          {isListening && (
            <AudioPlayer
              audioUrl={currentSection.audio_url}
              autoPlay={currentQuestionIndex === 0}
            />
          )}

          {currentSection?.passage_text && (
            <View style={styles.passageCard}>
              <Text style={styles.passageLabel}>READING PASSAGE</Text>
              <ScrollView style={styles.passageScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={styles.passageText}>{currentSection.passage_text}</Text>
              </ScrollView>
            </View>
          )}

          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
          />

          {isWriting && (
            <WritingEditor
              value={writingText}
              onChangeText={setWritingText}
              minWords={currentQuestion.question_text?.includes('150 words') ? 150 : 250}
            />
          )}

          {isSpeaking && (
            <AudioRecorder
              onRecordingComplete={setAudioRecording}
              maxDurationSeconds={120}
            />
          )}

        </Animated.View>
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Bottom bar ── */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          {currentQuestionIndex > 0 && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dispatch(goToPreviousQuestion()); }}
              style={styles.prevBtn}
            >
              <Ionicons name="chevron-back" size={18} color="#6B7280" />
              <Text style={styles.prevText}>Back</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => handleMoveNext(false)}
            disabled={!canProceed || isSubmitting}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={canProceed ? ['#8B6EFF', '#6C47FF'] : ['#E5E7EB', '#D1D5DB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={[styles.nextText, !canProceed && { color: '#9CA3AF' }]}>
                {isSubmitting ? 'Submitting…' : canProceed ? 'Next →' : 'Select an answer'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

// Animated loading dot
const LoadDot = ({ delay }) => {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
};

// Section break card shown between sections
const SectionBreakCard = ({ skill, duration, onStart }) => {
  const cfg = SKILL_COLORS[skill] || SKILL_COLORS.READING;
  const SKILL_ICONS = { LISTENING: '🎧', READING: '📖', WRITING: '✍️', SPEAKING: '🎤' };
  const SKILL_TIPS  = {
    LISTENING: 'Listen carefully — audio plays once. Read the questions before it starts.',
    READING:   'Skim the passage first, then read questions. Manage your time per question.',
    WRITING:   'Plan before you write. Check word count and review before submitting.',
    SPEAKING:  'Speak clearly and at a natural pace. Expand your answers with examples.',
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.sectionOverlay}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEmoji}>{SKILL_ICONS[skill] || '📝'}</Text>
        <View style={[styles.sectionChip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.sectionChipText, { color: cfg.text }]}>{skill} SECTION</Text>
        </View>
        <Text style={styles.sectionDuration}>{duration} minutes</Text>
        <Text style={styles.sectionTip}>{SKILL_TIPS[skill]}</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStart(); }}
          style={styles.sectionStartBtn}
        >
          <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.sectionStartGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.sectionStartText}>Begin Section →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default MockExamScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },

  // Loading
  loadScreen:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadContent: { alignItems: 'center', paddingHorizontal: 32 },
  loadEmoji:   { fontSize: 52, marginBottom: 20 },
  loadTitle:   { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  loadSub:     { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  loadDots:    { flexDirection: 'row', gap: 8 },
  dot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C47FF' },

  // Header
  headerSafe: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  exitBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' },

  headerCenter:   { alignItems: 'center', gap: 4 },
  skillChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  skillDot:       { width: 6, height: 6, borderRadius: 3 },
  skillLabel:     { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  questionCounter:{ fontSize: 12, color: '#9299B8', fontWeight: '500' },

  timerChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F5F6FA' },
  timerChipRed: { backgroundColor: '#FEE2E2' },
  timerText:    { fontSize: 13, fontWeight: '700', color: '#374151' },
  timerTextRed: { color: '#EF4444' },

  progressTrack: { height: 3, backgroundColor: '#F0F1F8' },
  progressFill:  { height: 3, borderRadius: 1.5 },

  // Body
  body:        { flex: 1 },
  bodyContent: { padding: 16, gap: 14 },

  passageCard:   { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  passageLabel:  { fontSize: 11, fontWeight: '700', color: '#9299B8', letterSpacing: 1, marginBottom: 10 },
  passageScroll: { maxHeight: 200 },
  passageText:   { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Bottom bar
  bottomSafe: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F1F8' },
  bottomBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 24 },
  prevBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB' },
  prevText:   { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  nextBtn:    { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  nextText:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Section break
  sectionOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,26,0.85)', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 24 },
  sectionCard:     { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', gap: 12 },
  sectionEmoji:    { fontSize: 48, marginBottom: 4 },
  sectionChip:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  sectionChipText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  sectionDuration: { fontSize: 15, fontWeight: '600', color: '#1A1B2F' },
  sectionTip:      { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  sectionStartBtn: { width: '100%', marginTop: 8 },
  sectionStartGrad:{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sectionStartText:{ fontSize: 16, fontWeight: '800', color: '#fff' },
});
