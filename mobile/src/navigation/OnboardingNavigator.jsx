import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, FadeIn, FadeOut, SlideInRight, SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeOnboarding, selectAuthLoading } from '../store/slices/authSlice';
import { Button } from '../components/ui';

const { width } = Dimensions.get('window');

// ─── Data ─────────────────────────────────────────────────────────────────────

const EXAMS = [
  {
    value: 'IELTS', emoji: '🇬🇧', label: 'IELTS',
    desc: 'International English Language Testing System',
    count: '120+',
    bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', dot: '#4F46E5',
  },
  {
    value: 'TEF', emoji: '🇫🇷', label: 'TEF',
    desc: "Test d'évaluation de français",
    count: '80+',
    bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', dot: '#10B981',
  },
  {
    value: 'TCF', emoji: '🇫🇷', label: 'TCF',
    desc: 'Test de Connaissance du Français',
    count: '70+',
    bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', dot: '#7C3AED',
  },
  {
    value: 'DALF', emoji: '🎓', label: 'DALF',
    desc: 'Diplôme Approfondi de Langue Française',
    count: '60+',
    bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#EA580C',
  },
];

const TIMELINES = [
  { label: 'Less than 1 month', months: 1 },
  { label: '1 – 3 months',      months: 3 },
  { label: '3 – 6 months',      months: 6 },
  { label: '6+ months',         months: 12 },
];

const IELTS_BANDS  = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
const CEFR_LEVELS  = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LEVELS = [
  { value: 'BEGINNER',     emoji: '🌱', label: 'Beginner',     desc: 'Just starting out' },
  { value: 'INTERMEDIATE', emoji: '📈', label: 'Intermediate', desc: 'Some knowledge, want to improve' },
  { value: 'ADVANCED',     emoji: '🎯', label: 'Advanced',     desc: 'Confident, aiming for top scores' },
];

// ─── Welcome Screen ───────────────────────────────────────────────────────────

const WelcomeStep = ({ onNext }) => {
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    ring1.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 1600, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1600 })),
      -1, false,
    );
    ring2.value = withRepeat(
      withSequence(withTiming(1.25, { duration: 2200, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 2200 })),
      -1, false,
    );
    float.value = withRepeat(
      withSequence(withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 1800 })),
      -1, false,
    );
  }, []);

  const ring1Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring1.value }] }));
  const ring2Style  = useAnimatedStyle(() => ({ transform: [{ scale: ring2.value }] }));
  const floatStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  return (
    <LinearGradient colors={['#1A0A3E', '#0D0828', '#0F0F1A']} style={styles.flex}>
      <SafeAreaView style={[styles.flex, styles.welcomeContainer]}>

        {/* Animated glow rings */}
        <View style={styles.illustrationArea}>
          <Animated.View style={[styles.ring2, ring2Style]} />
          <Animated.View style={[styles.ring1, ring1Style]} />
          <Animated.View style={[styles.iconCircle, floatStyle]}>
            <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.iconGradient}>
              <Text style={styles.welcomeIcon}>🎓</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Text */}
        <Animated.View entering={FadeIn.delay(300).duration(600)} style={styles.welcomeText}>
          <Text style={styles.welcomeTagline}>AI-Powered Exam Prep</Text>
          <Text style={styles.welcomeHeadline}>
            Pass Your{'\n'}Language Exam{'\n'}
            <Text style={styles.welcomeHighlight}>Faster</Text>
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Practice with real exam questions, get instant AI feedback, and track your progress to your target score.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeIn.delay(600).duration(600)} style={styles.welcomeCTA}>
          <Button title="Get Started →" onPress={onNext} size="lg" />
          <Text style={styles.welcomeNote}>Free to start · No credit card required</Text>
        </Animated.View>

      </SafeAreaView>
    </LinearGradient>
  );
};

// ─── Select Exam Step ─────────────────────────────────────────────────────────

const ExamStep = ({ selected, onSelect }) => (
  <View style={styles.stepContent}>
    <Text style={styles.stepEmoji}>🎯</Text>
    <Text style={styles.stepTitle}>Which exam are you{'\n'}preparing for?</Text>
    <Text style={styles.stepSubtitle}>We'll personalise your practice and AI feedback.</Text>

    <View style={styles.examGrid}>
      {EXAMS.map((exam) => {
        const isSelected = selected === exam.value;
        return (
          <Pressable
            key={exam.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(exam.value);
            }}
            style={[
              styles.examCard,
              { backgroundColor: exam.bg, borderColor: isSelected ? exam.dot : exam.border },
              isSelected && styles.examCardSelected,
            ]}
          >
            {isSelected && (
              <View style={[styles.examCheck, { backgroundColor: exam.dot }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Text style={styles.examEmoji}>{exam.emoji}</Text>
            <Text style={[styles.examLabel, { color: exam.text }]}>{exam.label}</Text>
            <Text style={[styles.examDesc, { color: exam.text + 'BB' }]} numberOfLines={2}>{exam.desc}</Text>
            <View style={styles.examFooter}>
              <Text style={[styles.examCount, { color: exam.dot }]}>{exam.count} Tests</Text>
              <View style={[styles.examArrow, { backgroundColor: exam.dot + '20' }]}>
                <Ionicons name="arrow-forward" size={12} color={exam.dot} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Goal Step ────────────────────────────────────────────────────────────────

const GoalStep = ({ examType, timeline, onTimeline, targetBand, onBand }) => {
  const isIELTS = examType === 'IELTS';
  const bands = isIELTS ? IELTS_BANDS : CEFR_LEVELS;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepEmoji}>📅</Text>
      <Text style={styles.stepTitle}>Set your goals</Text>
      <Text style={styles.stepSubtitle}>This powers your personalised study plan.</Text>

      <Text style={styles.sectionLabel}>When is your exam?</Text>
      <View style={styles.timelineList}>
        {TIMELINES.map((t) => {
          const active = timeline === t.months;
          return (
            <Pressable
              key={t.months}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTimeline(t.months);
              }}
              style={[styles.timelineRow, active && styles.timelineRowActive]}
            >
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? '#6C47FF' : '#C8CCDE'}
              />
              <Text style={[styles.timelineText, active && styles.timelineTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>
        {isIELTS ? 'Target band score?' : 'Target CEFR level?'}
      </Text>
      <View style={styles.bandGrid}>
        {bands.map((b) => {
          const active = targetBand === b;
          return (
            <Pressable
              key={b}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBand(b);
              }}
              style={[styles.bandChip, active && styles.bandChipActive]}
            >
              <Text style={[styles.bandText, active && styles.bandTextActive]}>
                {typeof b === 'number' ? b.toFixed(1) : b}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ─── Skill Level Step ─────────────────────────────────────────────────────────

const LevelStep = ({ selected, onSelect }) => (
  <View style={styles.stepContent}>
    <Text style={styles.stepEmoji}>📊</Text>
    <Text style={styles.stepTitle}>What's your current{'\n'}level?</Text>
    <Text style={styles.stepSubtitle}>We'll set the right difficulty to challenge you.</Text>

    <View style={styles.levelList}>
      {LEVELS.map((lvl) => {
        const isSelected = selected === lvl.value;
        return (
          <Pressable
            key={lvl.value}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect(lvl.value);
            }}
            style={[styles.levelCard, isSelected && styles.levelCardActive]}
          >
            <View style={[styles.levelIcon, isSelected && styles.levelIconActive]}>
              <Text style={{ fontSize: 24 }}>{lvl.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.levelLabel, isSelected && styles.levelLabelActive]}>{lvl.label}</Text>
              <Text style={styles.levelDesc}>{lvl.desc}</Text>
            </View>
            {isSelected && <Ionicons name="checkmark-circle" size={22} color="#6C47FF" />}
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Progress Dots ─────────────────────────────────────────────────────────────

const Dots = ({ total, current }) => (
  <View style={styles.dots}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotDone]}
      />
    ))}
  </View>
);

// ─── Main Navigator ───────────────────────────────────────────────────────────

const OnboardingNavigator = () => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);

  const [step, setStep] = useState(0); // 0=Welcome, 1=Exam, 2=Goal, 3=Level
  const [data, setData] = useState({
    target_exam:  null,
    exam_months:  null,
    target_band:  null,
    skill_level:  null,
  });

  const canContinue = () => {
    if (step === 1) return !!data.target_exam;
    if (step === 2) return !!data.exam_months && !!data.target_band;
    if (step === 3) return !!data.skill_level;
    return true;
  };

  const next = () => {
    if (step < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(s => s + 1);
    } else {
      const examDate = new Date();
      examDate.setMonth(examDate.getMonth() + (data.exam_months || 3));
      dispatch(completeOnboarding({
        target_exam:  data.target_exam,
        target_band:  data.target_band,
        exam_date:    examDate.toISOString().split('T')[0],
        skill_level:  data.skill_level,
      }))
      .unwrap()
      .catch(err => Alert.alert(
        'Setup Failed',
        typeof err === 'string' ? err : 'Could not complete setup. Please check your connection and try again.',
      ));
    }
  };

  const back = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s - 1);
  };

  // Welcome screen — full dark gradient, no chrome
  if (step === 0) {
    return <WelcomeStep onNext={() => setStep(1)} />;
  }

  const dotIndex = step - 1; // dots 0–2 for steps 1–3

  return (
    <SafeAreaView style={styles.lightScreen}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1B2F" />
        </Pressable>
        <Dots total={3} current={dotIndex} />
        <View style={{ width: 36 }} />
      </View>

      {/* Step content */}
      <Animated.View
        key={step}
        entering={SlideInRight.duration(280)}
        exiting={SlideOutLeft.duration(220)}
        style={styles.flex}
      >
        {step === 1 && (
          <ExamStep
            selected={data.target_exam}
            onSelect={(v) => setData(d => ({ ...d, target_exam: v }))}
          />
        )}
        {step === 2 && (
          <GoalStep
            examType={data.target_exam}
            timeline={data.exam_months}
            onTimeline={(v) => setData(d => ({ ...d, exam_months: v }))}
            targetBand={data.target_band}
            onBand={(v) => setData(d => ({ ...d, target_band: v }))}
          />
        )}
        {step === 3 && (
          <LevelStep
            selected={data.skill_level}
            onSelect={(v) => setData(d => ({ ...d, skill_level: v }))}
          />
        )}
      </Animated.View>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          title={step === 3 ? (isLoading ? 'Setting up...' : "Let's Go 🚀") : 'Continue'}
          onPress={next}
          disabled={!canContinue() || isLoading}
          loading={isLoading && step === 3}
          size="lg"
        />
      </View>

    </SafeAreaView>
  );
};

export default OnboardingNavigator;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Welcome
  welcomeContainer: { justifyContent: 'space-between', paddingBottom: 40 },
  illustrationArea: { alignItems: 'center', justifyContent: 'center', marginTop: 60, height: 220 },
  ring2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(108,71,255,0.06)', borderWidth: 1, borderColor: 'rgba(108,71,255,0.12)',
  },
  ring1: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(108,71,255,0.10)', borderWidth: 1, borderColor: 'rgba(108,71,255,0.2)',
  },
  iconCircle: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  iconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeIcon: { fontSize: 44 },
  welcomeText: { paddingHorizontal: 28, alignItems: 'center' },
  welcomeTagline: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#8B6EFF', textTransform: 'uppercase', marginBottom: 14 },
  welcomeHeadline: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 44, marginBottom: 16 },
  welcomeHighlight: { color: '#8B6EFF' },
  welcomeSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 23 },
  welcomeCTA: { paddingHorizontal: 28, gap: 12 },
  welcomeNote: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },

  // Light screen (steps 1–3)
  lightScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E4F0' },
  dotActive: { width: 20, backgroundColor: '#6C47FF' },
  dotDone: { backgroundColor: '#C7D2FE' },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12 },

  // Step common
  stepContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  stepEmoji: { fontSize: 40, marginBottom: 12 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#1A1B2F', lineHeight: 34, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 28 },

  // Exam grid
  examGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  examCard: {
    width: (width - 52) / 2,
    borderRadius: 16, borderWidth: 1.5,
    padding: 14, gap: 6, position: 'relative',
  },
  examCardSelected: { borderWidth: 2 },
  examCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  examEmoji: { fontSize: 26, marginBottom: 2 },
  examLabel: { fontSize: 16, fontWeight: '800' },
  examDesc: { fontSize: 11, lineHeight: 15 },
  examFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  examCount: { fontSize: 12, fontWeight: '700' },
  examArrow: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Goal
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  timelineList: { gap: 10, marginBottom: 28 },
  timelineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E4F0',
    backgroundColor: '#FAFAFA',
  },
  timelineRowActive: { borderColor: '#6C47FF', backgroundColor: 'rgba(108,71,255,0.05)' },
  timelineText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  timelineTextActive: { color: '#6C47FF', fontWeight: '700' },
  bandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  bandChip: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#FAFAFA', minWidth: 62, alignItems: 'center',
  },
  bandChipActive: { borderColor: '#6C47FF', backgroundColor: 'rgba(108,71,255,0.08)' },
  bandText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  bandTextActive: { color: '#6C47FF' },

  // Level
  levelList: { gap: 12 },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#FAFAFA',
  },
  levelCardActive: { borderColor: '#6C47FF', backgroundColor: 'rgba(108,71,255,0.05)' },
  levelIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F0F1F8', alignItems: 'center', justifyContent: 'center',
  },
  levelIconActive: { backgroundColor: 'rgba(108,71,255,0.12)' },
  levelLabel: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', marginBottom: 3 },
  levelLabelActive: { color: '#6C47FF' },
  levelDesc: { fontSize: 13, color: '#6B7280' },
});
