import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Share,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { resultAPI, aiAPI } from '../../services/api';
import { ProgressRing, ScoreProgressBar, ProBanner } from '../../components/ui';
import { Button } from '../../components/ui';

const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const SKILL_ICONS = { LISTENING: 'headset', READING: 'book-outline', WRITING: 'create-outline', SPEAKING: 'mic-outline' };
const SKILL_COLORS = { LISTENING: '#6C47FF', READING: '#3B82F6', WRITING: '#10B981', SPEAKING: '#F59E0B' };

const ResultsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { resultId, sessionId } = route.params;
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ['result', resultId],
    queryFn: () => resultAPI.getResult(resultId).then(r => r.data),
  });

  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedback', sessionId],
    queryFn: () => aiAPI.getSessionFeedback(sessionId).then(r => r.data),
    enabled: !!sessionId && activeTab === 'feedback',
    refetchInterval: (data) => data?.still_processing ? 5000 : false,
  });

  const result = data?.result;

  useEffect(() => {
    if (result) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [result]);

  const handleShare = async () => {
    if (!result) return;
    await Share.share({
      message: `🎯 I just scored ${result.band_score ? `Band ${result.band_score}` : result.overall_score} on a ${result.exam_type} mock test on Examify! Download the app to practice too 🚀`,
    });
  };

  if (isLoading || !result) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Calculating your results…</Text>
      </View>
    );
  }

  const band = result.band_score;
  const cefrLevel = result.score_breakdown?.cefr_level || result.cefr_level;
  const overallScore = result.overall_score;
  const isIELTS = !!band;

  const skillScores = [
    { skill: 'LISTENING', score: result.listening_score },
    { skill: 'READING',   score: result.reading_score },
    { skill: 'WRITING',   score: result.writing_score },
    { skill: 'SPEAKING',  score: result.speaking_score },
  ].filter(s => s.score != null);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.popToTop()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#1A1B2F" />
          </Pressable>
          <Text style={styles.headerTitle}>Overall Band Score</Text>
          <Pressable onPress={handleShare} hitSlop={12}>
            <Ionicons name="share-outline" size={22} color="#1A1B2F" />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['overview', 'feedback', 'improvement'].map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {activeTab === 'overview' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.flex}>
            {/* Score Ring */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.ringSection}>
              <ProgressRing
                score={isIELTS ? band : (overallScore / 50)}
                maxScore={isIELTS ? 9 : 9}
                size={180}
                strokeWidth={14}
              />
              {cefrLevel && (
                <Text style={styles.cefrLabel}>{cefrLevel}</Text>
              )}
              {isIELTS ? (
                <Text style={styles.scoreBig}>{band?.toFixed(1)}</Text>
              ) : (
                <Text style={styles.scoreBig}>{overallScore}</Text>
              )}
              <Text style={styles.goodJob}>Good Job! 🎉</Text>
              <Text style={styles.topText}>
                {isIELTS
                  ? `Band ${band?.toFixed(1)} — ${bandLabel(band)}`
                  : `Score ${overallScore}/450`}
              </Text>
            </Animated.View>

            {/* Skill Breakdown */}
            {skillScores.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
                <Text style={styles.cardTitle}>Skill Breakdown</Text>
                {skillScores.map(({ skill, score }, i) => (
                  <Animated.View key={skill} entering={FadeInDown.delay(400 + i * 80).duration(350)}>
                    <ScoreProgressBar
                      skill={skill}
                      score={score}
                      maxScore={isIELTS ? 9 : 100}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* Weak / Strong areas */}
            {result.weak_areas?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.card}>
                <Text style={styles.cardTitle}>Areas to Improve</Text>
                {result.weak_areas.slice(0, 4).map(area => (
                  <View key={area} style={styles.areaRow}>
                    <View style={styles.areaDot} />
                    <Text style={styles.areaText}>{area}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* XP earned */}
            {result.xp_earned > 0 && (
              <Animated.View entering={FadeInDown.delay(700).duration(400)} style={styles.xpCard}>
                <LinearGradient colors={['#8B6EFF', '#6C47FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.xpGrad}>
                  <Text style={styles.xpIcon}>⚡</Text>
                  <Text style={styles.xpText}>+{result.xp_earned} XP earned</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Actions */}
            <Animated.View entering={FadeInDown.delay(800).duration(400)} style={styles.actions}>
              <Pressable onPress={() => navigation.navigate('ReviewAnswers', { sessionId })} style={styles.reviewBtn}>
                <Text style={styles.reviewBtnText}>Review Answers</Text>
              </Pressable>
              <Pressable onPress={handleShare} style={styles.shareBtn}>
                <Ionicons name="share-social-outline" size={18} color="#1A1B2F" />
                <Text style={styles.shareBtnText}>Share Result</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}

        {activeTab === 'feedback' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackSection}>
            {feedbackLoading ? (
              <Text style={styles.processingText}>Loading AI feedback…</Text>
            ) : !feedbackData?.feedback?.length ? (
              <View style={styles.noFeedback}>
                <Text style={styles.noFeedbackIcon}>🤖</Text>
                <Text style={styles.noFeedbackTitle}>No AI feedback yet</Text>
                <Text style={styles.noFeedbackSub}>Complete writing or speaking questions to get AI scoring.</Text>
              </View>
            ) : (
              feedbackData.feedback.map((fb, i) => (
                <Animated.View key={fb.id} entering={FadeInDown.delay(i * 100).duration(350)}>
                  <FeedbackCard feedback={fb} />
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}

        {activeTab === 'improvement' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.improvSection}>
            {result.strong_areas?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💪 Strong Areas</Text>
                {result.strong_areas.map(area => (
                  <View key={area} style={[styles.areaRow, { gap: 8 }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.areaText}>{area}</Text>
                  </View>
                ))}
              </View>
            )}
            {result.weak_areas?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📌 Focus Areas</Text>
                {result.weak_areas.map(area => (
                  <View key={area} style={[styles.areaRow, { gap: 8 }]}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.areaText}>{area}</Text>
                  </View>
                ))}
              </View>
            )}
            <ProBanner context="insights" onUpgrade={() => navigation.navigate('ProfileTab', { screen: 'Subscription' })} />
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const FeedbackCard = ({ feedback }) => {
  const isFailed = feedback.status === 'FAILED';
  const isProcessing = feedback.status === 'PROCESSING';
  const color = SKILL_COLORS[feedback.skill] || '#6C47FF';

  return (
    <View style={styles.fbCard}>
      <View style={styles.fbHeader}>
        <View style={[styles.fbIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={SKILL_ICONS[feedback.skill] || 'star-outline'} size={18} color={color} />
        </View>
        <Text style={styles.fbSkill}>{feedback.skill}</Text>
        {feedback.overall_score != null && (
          <View style={[styles.fbScore, { backgroundColor: color + '18' }]}>
            <Text style={[styles.fbScoreText, { color }]}>Band {feedback.overall_score?.toFixed(1)}</Text>
          </View>
        )}
      </View>
      {isFailed && <Text style={styles.fbFailed}>Scoring failed for {feedback.skill}. Please try again.</Text>}
      {isProcessing && <Text style={styles.fbProcessing}>⏳ AI is scoring your response…</Text>}
      {feedback.detailed_feedback && <Text style={styles.fbDetail}>{feedback.detailed_feedback}</Text>}
      {feedback.strengths?.length > 0 && (
        <View style={styles.fbSection}>
          <Text style={styles.fbSectionTitle}>✅ Strengths</Text>
          {feedback.strengths.map((s, i) => <Text key={i} style={styles.fbBullet}>· {s}</Text>)}
        </View>
      )}
      {feedback.improvements?.length > 0 && (
        <View style={styles.fbSection}>
          <Text style={styles.fbSectionTitle}>📌 Improvements</Text>
          {feedback.improvements.map((s, i) => <Text key={i} style={styles.fbBullet}>· {s}</Text>)}
        </View>
      )}
    </View>
  );
};

const bandLabel = (band) => {
  if (!band) return '';
  if (band >= 8.5) return 'Expert user';
  if (band >= 7.0) return 'Good user';
  if (band >= 5.5) return 'Competent user';
  return 'Modest user';
};

export default ResultsScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  scroll: { paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1B2F' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E4F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6C47FF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9299B8' },
  tabTextActive: { color: '#6C47FF', fontWeight: '700' },

  ringSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, backgroundColor: '#fff', marginBottom: 16, position: 'relative' },
  scoreBig: { position: 'absolute', fontSize: 42, fontWeight: '800', color: '#1A1B2F', top: 32 + 65 },
  cefrLabel: { fontSize: 14, fontWeight: '700', color: '#6C47FF', marginTop: 8 },
  goodJob: { fontSize: 20, fontWeight: '800', color: '#1A1B2F', marginTop: 16 },
  topText: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginHorizontal: 16, marginBottom: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', marginBottom: 10 },

  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  areaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  areaText: { fontSize: 14, color: '#1A1B2F', flex: 1 },

  xpCard: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  xpGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  xpIcon: { fontSize: 20 },
  xpText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  actions: { paddingHorizontal: 16, gap: 10 },
  reviewBtn: { backgroundColor: '#1A1B2F', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  reviewBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#fff' },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: '#1A1B2F' },

  feedbackSection: { padding: 16, gap: 14 },
  processingText: { textAlign: 'center', padding: 40, color: '#9299B8', fontSize: 14 },
  noFeedback: { alignItems: 'center', padding: 40 },
  noFeedbackIcon: { fontSize: 40, marginBottom: 12 },
  noFeedbackTitle: { fontSize: 18, fontWeight: '700', color: '#1A1B2F', marginBottom: 6 },
  noFeedbackSub: { fontSize: 14, color: '#9299B8', textAlign: 'center', lineHeight: 20 },

  fbCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 10 },
  fbHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fbIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fbSkill: { fontSize: 15, fontWeight: '700', color: '#1A1B2F', flex: 1 },
  fbScore: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  fbScoreText: { fontSize: 13, fontWeight: '700' },
  fbFailed: { fontSize: 14, color: '#EF4444' },
  fbProcessing: { fontSize: 14, color: '#F59E0B' },
  fbDetail: { fontSize: 14, color: '#374151', lineHeight: 21 },
  fbSection: { gap: 6 },
  fbSectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A1B2F' },
  fbBullet: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  improvSection: { padding: 16, gap: 14 },
});
