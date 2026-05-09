import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { selectUser } from '../../store/slices/authSlice';
import { fetchStreak } from '../../store/slices/streakSlice';
import { examAPI } from '../../services/api';
import { Button, SkeletonCard, SkeletonRow } from '../../components/ui';
import { useAppTheme } from '../../theme/ThemeContext';

// ─── Skill config ─────────────────────────────────────────────────────────────

const SKILLS = [
  { key: 'LISTENING', label: 'Listening', icon: 'headset',      color: '#6C47FF', bg: 'rgba(108,71,255,0.12)', count: '24 Tests' },
  { key: 'READING',   label: 'Reading',   icon: 'book-outline', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  count: '14 Tests' },
  { key: 'WRITING',   label: 'Writing',   icon: 'create-outline',color: '#10B981', bg: 'rgba(16,185,129,0.12)', count: '16 Tests' },
  { key: 'SPEAKING',  label: 'Speaking',  icon: 'mic-outline',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   count: '20 Tests' },
];

// ─── HomeScreen ───────────────────────────────────────────────────────────────

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const streak = useSelector(s => s.streak);
  const theme = useAppTheme();

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there';
  const targetExam = user?.target_exam || 'IELTS';

  const { data: examsData, isLoading, refetch } = useQuery({
    queryKey: ['exams-home', targetExam],
    queryFn: () => examAPI.list({ exam_type: targetExam, limit: 5 }).then(r => r.data),
  });

  const { data: dailyData } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => examAPI.getDailyChallenge().then(r => r.data),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => { dispatch(fetchStreak()); }, [dispatch]);

  const nextExam = examsData?.exams?.[0];

  const goToExam = useCallback((examId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ExamsTab', { screen: 'MockExam', params: { examId } });
  }, [navigation]);

  const goToExamList = useCallback((skill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ExamsTab', { screen: 'ExamList', params: { skill } });
  }, [navigation]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6C47FF" />}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Dark header ─────────────────────────────────────── */}
        <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.name}>{firstName} 👋</Text>
                <Text style={styles.subHeadline}>
                  Ready to ace your{' '}
                  <Text style={styles.examHighlight}>{targetExam} exam?</Text>
                </Text>
              </View>
              <Pressable style={styles.notifBtn} hitSlop={10}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                <View style={styles.notifDot} />
              </Pressable>
            </View>

            {/* Streak pill */}
            <View style={styles.streakRow}>
              <View style={styles.streakPill}>
                <Text style={styles.streakFlame}>🔥</Text>
                <Text style={styles.streakCount}>{streak.currentStreak ?? 0}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
              {streak.practicedToday && (
                <View style={styles.donePill}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.doneText}>Done today</Text>
                </View>
              )}
              {streak.streakAtRisk && !streak.practicedToday && (
                <View style={styles.riskPill}>
                  <Text style={styles.riskText}>⚠️ {streak.hoursToMidnight}h left!</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── Your Next Test ───────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.sectionLabel}>YOUR NEXT TEST</Text>
            {isLoading ? (
              <SkeletonCard />
            ) : nextExam ? (
              <NextTestCard exam={nextExam} onPress={() => goToExam(nextExam.id)} theme={theme} />
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No exams available yet</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Daily Challenge ──────────────────────────────── */}
          {dailyData?.questions?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(400)}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('DailyChallenge'); }}>
                <LinearGradient
                  colors={['#00C6A2', '#00B896']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.dailyCard}
                >
                  <View style={styles.dailyLeft}>
                    <Text style={styles.dailyTag}>DAILY CHALLENGE</Text>
                    <Text style={styles.dailyTitle}>{dailyData.questions.length} Mixed Questions</Text>
                    <Text style={styles.dailySub}>+50 XP · All exam types</Text>
                  </View>
                  <View style={styles.dailyIconWrap}>
                    <Text style={{ fontSize: 30 }}>⚡</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* ── Practice by Skills ───────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(260).duration(400)}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>PRACTICE BY SKILLS</Text>
              <Pressable onPress={() => navigation.navigate('ExamsTab')}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            <View style={styles.skillList}>
              {SKILLS.map((skill, i) => (
                <Animated.View key={skill.key} entering={FadeInDown.delay(300 + i * 60).duration(350)}>
                  <SkillRow skill={skill} onPress={() => goToExamList(skill.key)} theme={theme} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* ── Recent Exams ─────────────────────────────────── */}
          {(examsData?.exams?.length ?? 0) > 1 && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>MORE EXAMS</Text>
                <Pressable onPress={() => navigation.navigate('ExamsTab')}>
                  <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
              </View>
              <View style={styles.moreList}>
                {examsData.exams.slice(1, 4).map((exam) => (
                  <ExamRow key={exam.id} exam={exam} onPress={() => goToExam(exam.id)} theme={theme} />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const NextTestCard = ({ exam, onPress, theme = {} }) => (
  <View style={[styles.nextCard, { backgroundColor: theme.card }]}>
    <View style={styles.nextCardTop}>
      <View style={{ flex: 1 }}>
        <View style={styles.nextBadgeRow}>
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>{exam.exam_type}</Text>
          </View>
          {exam.is_free && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
        <Text style={[styles.nextTitle, { color: theme.text }]} numberOfLines={2}>{exam.title}</Text>
        <Text style={[styles.nextMeta, { color: theme.textSecondary }]}>
          {exam.skills?.join(', ') || 'All skills'} · {exam.total_duration_minutes} min
        </Text>
      </View>
      <View style={styles.nextChartIcon}>
        <Ionicons name="bar-chart" size={28} color="#6C47FF" />
      </View>
    </View>
    <Button title="Start Test" onPress={onPress} size="md" />
  </View>
);

const SkillRow = ({ skill, onPress, theme = {} }) => (
  <Pressable onPress={onPress} style={[styles.skillRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={[styles.skillIcon, { backgroundColor: skill.bg }]}>
      <Ionicons name={skill.icon} size={20} color={skill.color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.skillName, { color: theme.text }]}>{skill.label}</Text>
      <Text style={[styles.skillCount, { color: theme.textSecondary }]}>{skill.count}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#C8CCDE" />
  </Pressable>
);

const ExamRow = ({ exam, onPress, theme = {} }) => {
  const TYPE_COLORS = {
    IELTS: '#4F46E5', TEF: '#10B981', TCF: '#7C3AED', DALF: '#EA580C',
  };
  const color = TYPE_COLORS[exam.exam_type] || '#6C47FF';
  return (
    <Pressable onPress={onPress} style={[styles.examRow, { backgroundColor: theme.card }]}>
      <View style={[styles.examRowDot, { backgroundColor: color + '20' }]}>
        <View style={[styles.examDotInner, { backgroundColor: color }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.examRowTitle, { color: theme.text }]} numberOfLines={1}>{exam.title}</Text>
        <Text style={[styles.examRowMeta, { color: theme.textSecondary }]}>{exam.exam_type} · {exam.total_duration_minutes} min</Text>
      </View>
      {exam.is_free && <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>}
      <Ionicons name="chevron-forward" size={16} color="#C8CCDE" />
    </Pressable>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default HomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2, marginBottom: 4 },
  subHeadline: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  examHighlight: { color: '#8B6EFF', fontWeight: '700' },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#1A0A3E' },

  // Streak
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  streakFlame: { fontSize: 14 },
  streakCount: { fontSize: 14, fontWeight: '800', color: '#fff' },
  streakLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  doneText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  riskPill: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  riskText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },

  // Body
  body: { padding: 16, gap: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9299B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#6C47FF' },

  // Next Test card
  nextCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 16, shadowColor: '#6C47FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  nextCardTop: { flexDirection: 'row', gap: 12 },
  nextBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  nextBadge: { backgroundColor: 'rgba(108,71,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nextBadgeText: { fontSize: 11, fontWeight: '700', color: '#6C47FF' },
  freeBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freeBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  nextTitle: { fontSize: 17, fontWeight: '800', color: '#1A1B2F', lineHeight: 24, marginBottom: 6 },
  nextMeta: { fontSize: 12, color: '#9299B8', fontWeight: '500' },
  nextChartIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(108,71,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9299B8' },

  // Daily challenge
  dailyCard: { borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dailyLeft: { flex: 1 },
  dailyTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2, marginBottom: 4 },
  dailyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  dailySub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  dailyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Skill rows
  skillList: { gap: 10 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  skillIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  skillName: { fontSize: 15, fontWeight: '700', color: '#1A1B2F' },
  skillCount: { fontSize: 12, color: '#9299B8', marginTop: 2 },

  // Exam rows
  moreList: { gap: 8 },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  examRowDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  examDotInner: { width: 12, height: 12, borderRadius: 6 },
  examRowTitle: { fontSize: 14, fontWeight: '700', color: '#1A1B2F', marginBottom: 3 },
  examRowMeta: { fontSize: 12, color: '#9299B8' },
});
