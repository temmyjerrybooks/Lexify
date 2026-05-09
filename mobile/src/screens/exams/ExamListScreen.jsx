import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { examAPI } from '../../services/api';
import { Button } from '../../components/ui';
import { useAppTheme } from '../../theme/ThemeContext';

const EXAM_TYPES = ['All', 'IELTS', 'TEF', 'TCF', 'DALF'];

const TYPE_CONFIG = {
  IELTS: { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', dot: '#4F46E5', emoji: '🇬🇧', desc: 'International English Language Testing System', count: '120+' },
  TEF:   { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', dot: '#10B981', emoji: '🇫🇷', desc: "Test d'évaluation de français", count: '80+' },
  TCF:   { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', dot: '#7C3AED', emoji: '🇫🇷', desc: 'Test de Connaissance du Français', count: '70+' },
  DALF:  { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#EA580C', emoji: '🎓', desc: 'Diplôme Approfondi de Langue Française', count: '60+' },
};

const ExamListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const initialSkill = route.params?.skill;

  const [selectedType, setSelectedType] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams', selectedType],
    queryFn: () => examAPI.list({
      exam_type: selectedType !== 'All' ? selectedType : undefined,
      limit: 50,
    }).then(r => r.data),
  });

  const exams = (data?.exams || []).filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const theme = useAppTheme();

  const goToExam = (examId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('MockExam', { examId });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.card }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Select Exam Type</Text>
          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Ionicons name="search-outline" size={17} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search exams…"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color="#9299B8" />
              </Pressable>
            )}
          </View>
          {/* Type filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {EXAM_TYPES.map((t) => {
              const active = selectedType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(t); }}
                  style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      <FlatList
        data={exams}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          selectedType === 'All' && !search ? (
            <Animated.View entering={FadeInDown.duration(350)}>
              {/* 2x2 Type Cards */}
              <View style={styles.typeGrid}>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                  <Pressable
                    key={type}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedType(type); }}
                    style={[styles.typeCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
                  >
                    <Text style={styles.typeEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: cfg.text }]}>{type}</Text>
                    <Text style={[styles.typeDesc, { color: cfg.text + 'AA' }]} numberOfLines={2}>{cfg.desc}</Text>
                    <View style={styles.typeFooter}>
                      <Text style={[styles.typeCount, { color: cfg.dot }]}>{cfg.count} Tests</Text>
                      <View style={[styles.typeArrow, { backgroundColor: cfg.dot + '20' }]}>
                        <Ionicons name="arrow-forward" size={12} color={cfg.dot} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Custom Mock Test CTA */}
              <Pressable onPress={() => navigation.navigate('ExamsTab')} style={styles.customCard}>
                <LinearGradient colors={['#8B6EFF', '#6C47FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.customGradient}>
                  <View>
                    <Text style={styles.customTitle}>Custom Mock Test</Text>
                    <Text style={styles.customDesc}>Create your own test based on your needs</Text>
                  </View>
                  <View style={styles.customPlus}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </View>
                </LinearGradient>
              </Pressable>

              {exams.length > 0 && <Text style={[styles.listSectionTitle, { color: theme.text }]}>All Exams</Text>}
            </Animated.View>
          ) : null
        }
        renderItem={({ item: exam, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
            <ExamCard exam={exam} onPress={() => goToExam(exam.id)} />
          </Animated.View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No exams found</Text>
              <Text style={styles.emptyHint}>Try a different filter or search</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const ExamCard = ({ exam, onPress }) => {
  const theme = useAppTheme();
  const cfg = TYPE_CONFIG[exam.exam_type] || TYPE_CONFIG.IELTS;
  return (
    <View style={[styles.examCard, { backgroundColor: theme.card }]}>
      <View style={styles.examCardTop}>
        <View style={[styles.examTypeBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Text style={[styles.examTypeBadgeText, { color: cfg.text }]}>{exam.exam_type}</Text>
        </View>
        {exam.is_free && <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>}
      </View>
      <Text style={[styles.examTitle, { color: theme.text }]} numberOfLines={2}>{exam.title}</Text>
      {exam.description ? (
        <Text style={[styles.examDesc, { color: theme.textSecondary }]} numberOfLines={2}>{exam.description}</Text>
      ) : null}
      <View style={styles.examMeta}>
        <View style={[styles.metaChip, { backgroundColor: theme.cardAlt }]}>
          <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{exam.total_duration_minutes} min</Text>
        </View>
        <View style={[styles.metaChip, { backgroundColor: theme.cardAlt }]}>
          <Ionicons name="bar-chart-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{exam.difficulty}</Text>
        </View>
      </View>
      <Button title="Start Exam" onPress={onPress} size="md" />
    </View>
  );
};

export default ExamListScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1B2F', marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F6FA', borderRadius: 12, borderWidth: 1, borderColor: '#E2E4F0', paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1B2F', padding: 0 },
  chips: { gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 110, gap: 14 },

  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  typeCard: { width: '47%', borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 5 },
  typeEmoji: { fontSize: 24, marginBottom: 2 },
  typeLabel: { fontSize: 16, fontWeight: '800' },
  typeDesc: { fontSize: 11, lineHeight: 15 },
  typeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  typeCount: { fontSize: 12, fontWeight: '700' },
  typeArrow: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  customCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  customGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  customTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  customDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  customPlus: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  listSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', marginBottom: 4 },

  // Exam card
  examCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  examCardTop: { flexDirection: 'row', gap: 8 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  examTypeBadgeText: { fontSize: 11, fontWeight: '700' },
  freeBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  freeBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  examTitle: { fontSize: 16, fontWeight: '800', color: '#1A1B2F', lineHeight: 22 },
  examDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  examMeta: { flexDirection: 'row', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F6FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 12, color: '#9299B8', fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#1A1B2F', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#9299B8' },
});
