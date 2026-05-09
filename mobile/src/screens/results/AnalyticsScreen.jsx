import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Polyline, Circle, Defs, LinearGradient as SvgGrad, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { resultAPI } from '../../services/api';
import { ScoreProgressBar } from '../../components/ui';
import { selectUser } from '../../store/slices/authSlice';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;
const CHART_H = 120;

const TIME_RANGES = [
  { label: 'This Month', days: 30 },
  { label: '3 Months',   days: 90 },
  { label: '1 Year',     days: 365 },
];

const AnalyticsScreen = () => {
  const user = useSelector(selectUser);
  const streak = useSelector(s => s.streak);
  const [range, setRange] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => resultAPI.getAnalytics({ days: range }).then(r => r.data),
  });

  const summary  = data?.summary || {};
  const skills   = data?.skill_averages || {};
  const history  = data?.score_history || [];
  const recent   = data?.recent_results || [];

  const hasHistory = history.length > 1;
  const overallProgress = summary.avg_score
    ? Math.min(Math.round((summary.avg_score / 9) * 100), 100)
    : 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <View style={styles.rangeRow}>
            {TIME_RANGES.map(({ label, days }) => (
              <Pressable
                key={days}
                onPress={() => setRange(days)}
                style={[styles.rangeChip, range === days && styles.rangeChipActive]}
              >
                <Text style={[styles.rangeText, range === days && styles.rangeTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Overall Progress */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
          <Text style={styles.cardLabel}>Overall Progress</Text>
          <Text style={styles.progressPct}>{summary.avg_score ? `${summary.avg_score?.toFixed(1)}` : '—'}</Text>
          <Text style={styles.progressSub}>{summary.avg_score ? 'Average Band Score' : 'Complete some exams to see your progress'}</Text>

          {/* Mini line chart */}
          {hasHistory && <MiniChart data={history} />}
        </Animated.View>

        {/* Achievements */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.achieveRow}>
          <AchieveCard icon="📝" value={summary.total_exams ?? 0} label="Tests Taken" color="#6C47FF" />
          <AchieveCard icon="📊" value={summary.avg_score ? `${summary.avg_score?.toFixed(1)}` : '—'} label="Avg Score" color="#10B981" />
          <AchieveCard icon="🔥" value={streak.currentStreak ?? 0} label="Day Streak" color="#F59E0B" />
        </Animated.View>

        {/* Skill breakdown */}
        {Object.keys(skills).length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
            <Text style={styles.cardTitle}>Skill Averages</Text>
            {['LISTENING', 'READING', 'WRITING', 'SPEAKING'].map(skill => (
              skills[skill.toLowerCase()] != null && (
                <ScoreProgressBar
                  key={skill}
                  skill={skill}
                  score={skills[skill.toLowerCase()]}
                  maxScore={9}
                />
              )
            ))}
          </Animated.View>
        )}

        {/* Recent tests */}
        {recent.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
            <Text style={styles.cardTitle}>Recent Tests</Text>
            {recent.map((item, i) => (
              <Animated.View key={item.id || i} entering={FadeInDown.delay(450 + i * 60).duration(300)}>
                <RecentRow item={item} />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {!isLoading && !summary.total_exams && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>Complete your first exam to start tracking progress.</Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
};

const MiniChart = ({ data }) => {
  const scores = data.map(d => d.score || d.band_score || 0);
  const maxVal = Math.max(...scores, 9);
  const minVal = Math.min(...scores, 0);
  const range = maxVal - minVal || 1;

  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * CHART_W;
    const y = CHART_H - ((s - minVal) / range) * CHART_H;
    return `${x},${y}`;
  });

  const areaPath = `M0,${CHART_H} L${pts.join(' L')} L${CHART_W},${CHART_H} Z`;

  return (
    <View style={{ marginTop: 16, height: CHART_H }}>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <SvgGrad id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6C47FF" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#6C47FF" stopOpacity="0.01" />
          </SvgGrad>
        </Defs>
        <Path d={areaPath} fill="url(#areaGrad)" />
        <Polyline
          points={pts.join(' ')}
          fill="none"
          stroke="#6C47FF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * CHART_W;
          const y = CHART_H - ((s - minVal) / range) * CHART_H;
          return <Circle key={i} cx={x} cy={y} r={3.5} fill="#6C47FF" />;
        })}
      </Svg>
      <View style={styles.chartLabels}>
        {data.slice(0, 4).map((d, i) => (
          <Text key={i} style={styles.chartLabel}>
            {d.week ? `Week ${i + 1}` : `W${i + 1}`}
          </Text>
        ))}
      </View>
    </View>
  );
};

const AchieveCard = ({ icon, value, label, color }) => (
  <View style={styles.achieveCard}>
    <Text style={styles.achieveIcon}>{icon}</Text>
    <Text style={[styles.achieveValue, { color }]}>{value}</Text>
    <Text style={styles.achieveLabel}>{label}</Text>
  </View>
);

const RecentRow = ({ item }) => {
  const TYPE_COLORS = { IELTS: '#4F46E5', TEF: '#10B981', TCF: '#7C3AED', DALF: '#EA580C' };
  const color = TYPE_COLORS[item.exam_type] || '#6C47FF';
  const score = item.band_score ?? item.overall_score;
  const daysAgo = item.created_at
    ? Math.floor((Date.now() - new Date(item.created_at)) / 86400000)
    : null;

  return (
    <View style={styles.recentRow}>
      <View style={[styles.recentDot, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 14 }}>
          { item.exam_type === 'IELTS' ? '🇬🇧' : item.exam_type === 'DALF' ? '🎓' : '🇫🇷' }
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recentTitle} numberOfLines={1}>{item.exam_title || item.exam_type + ' Mock Test'}</Text>
        <Text style={styles.recentMeta}>{daysAgo != null ? `${daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}` : ''}</Text>
      </View>
      <View style={[styles.recentScore, { backgroundColor: color + '15' }]}>
        <Text style={[styles.recentScoreText, { color }]}>
          {score ? (item.band_score ? score.toFixed(1) : score) : '—'}
        </Text>
      </View>
    </View>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1B2F', marginBottom: 14 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#fff' },
  rangeChipActive: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  rangeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  rangeTextActive: { color: '#fff' },

  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#9299B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', marginBottom: 14 },
  progressPct: { fontSize: 48, fontWeight: '800', color: '#1A1B2F' },
  progressSub: { fontSize: 13, color: '#9299B8', marginTop: 2 },

  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLabel: { fontSize: 11, color: '#9299B8' },

  achieveRow: { flexDirection: 'row', gap: 10 },
  achieveCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  achieveIcon: { fontSize: 22, marginBottom: 4 },
  achieveValue: { fontSize: 22, fontWeight: '800' },
  achieveLabel: { fontSize: 11, color: '#9299B8', fontWeight: '500', textAlign: 'center' },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  recentDot: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#1A1B2F', marginBottom: 2 },
  recentMeta: { fontSize: 12, color: '#9299B8' },
  recentScore: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  recentScoreText: { fontSize: 14, fontWeight: '800' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1B2F', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#9299B8', textAlign: 'center', lineHeight: 20 },
});
