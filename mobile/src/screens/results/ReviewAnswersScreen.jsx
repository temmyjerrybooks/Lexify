import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { examAPI } from '../../services/api';

const SKILL_COLORS = {
  LISTENING: { bg: '#EEF2FF', text: '#3730A3', dot: '#4F46E5' },
  READING:   { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  WRITING:   { bg: '#FFF7ED', text: '#C2410C', dot: '#EA580C' },
  SPEAKING:  { bg: '#F5F3FF', text: '#5B21B6', dot: '#7C3AED' },
};

const ReviewAnswersScreen = () => {
  const navigation = useNavigation();
  const { sessionId } = useRoute().params;
  const [expandedSections, setExpandedSections] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['review', sessionId],
    queryFn: () => examAPI.getSessionReview(sessionId).then(r => r.data),
  });

  const toggleSection = (id) =>
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#1A1B2F" />
            </Pressable>
            <Text style={styles.headerTitle}>Review Answers</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading your answers…</Text>
        </View>
      </View>
    );
  }

  const { sections = [], total_questions, correct_count, accuracy_pct } = data || {};

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#1A1B2F" />
          </Pressable>
          <Text style={styles.headerTitle}>Review Answers</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Summary bar */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.summaryCard}>
          <SummaryPill value={total_questions} label="Questions" color="#6C47FF" />
          <SummaryPill value={correct_count} label="Correct" color="#10B981" />
          <SummaryPill value={total_questions - correct_count} label="Wrong" color="#EF4444" />
          <SummaryPill value={`${accuracy_pct}%`} label="Accuracy" color="#F59E0B" />
        </Animated.View>

        {/* Sections */}
        {sections.map((section, si) => {
          const cfg = SKILL_COLORS[section.skill] || SKILL_COLORS.READING;
          const isOpen = expandedSections[section.section_id] !== false; // default open
          const sectionCorrect = section.questions.filter(q => q.is_correct).length;

          return (
            <Animated.View key={section.section_id} entering={FadeInDown.delay(si * 80).duration(400)}>
              <Pressable onPress={() => toggleSection(section.section_id)} style={styles.sectionHeader}>
                <View style={[styles.skillChip, { backgroundColor: cfg.bg }]}>
                  <View style={[styles.skillDot, { backgroundColor: cfg.dot }]} />
                  <Text style={[styles.skillLabel, { color: cfg.text }]}>{section.skill}</Text>
                </View>
                <Text style={styles.sectionScore}>{sectionCorrect}/{section.questions.length}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16} color="#9299B8"
                />
              </Pressable>

              {isOpen && section.questions.map((q, qi) => (
                <QuestionRow key={q.question_id || qi} question={q} index={qi} />
              ))}
            </Animated.View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const SummaryPill = ({ value, label, color }) => (
  <View style={styles.summaryPill}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const QuestionRow = ({ question, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isCorrect = question.is_correct;
  const isWritingOrSpeaking = ['ESSAY', 'SPEAKING_RESPONSE'].includes(question.question_type);

  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={styles.questionCard}>
      {/* Top row */}
      <View style={styles.questionTop}>
        <View style={[styles.resultIcon, { backgroundColor: isCorrect ? '#D1FAE5' : isWritingOrSpeaking ? '#EEF2FF' : '#FEE2E2' }]}>
          <Ionicons
            name={isCorrect ? 'checkmark' : isWritingOrSpeaking ? 'time-outline' : 'close'}
            size={14}
            color={isCorrect ? '#10B981' : isWritingOrSpeaking ? '#6C47FF' : '#EF4444'}
          />
        </View>
        <Text style={styles.questionNum}>Q{index + 1}</Text>
        <Text style={styles.questionText} numberOfLines={expanded ? undefined : 2}>
          {question.question_text}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#C4C9DF" />
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.questionDetail}>
          {/* MCQ options */}
          {question.options?.length > 0 && (
            <View style={styles.optionsList}>
              {question.options.map((opt) => {
                const isUserAnswer = question.user_answer === opt.label;
                const isCorrectAnswer = question.correct_answer === opt.label;
                let bg = '#F9FAFB', border = '#E5E7EB', textColor = '#374151';
                if (isCorrectAnswer) { bg = '#D1FAE5'; border = '#10B981'; textColor = '#065F46'; }
                else if (isUserAnswer && !isCorrect) { bg = '#FEE2E2'; border = '#EF4444'; textColor = '#991B1B'; }

                return (
                  <View key={opt.label} style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}>
                    <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
                    <Text style={[styles.optionText, { color: textColor }]}>{opt.text}</Text>
                    {isCorrectAnswer && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
                    {isUserAnswer && !isCorrect && <Ionicons name="close-circle" size={14} color="#EF4444" />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Short answer / fill in blank */}
          {!question.options?.length && !isWritingOrSpeaking && (
            <View style={styles.answerGrid}>
              <AnswerBox label="Your answer" value={question.user_answer || '(not answered)'} correct={isCorrect} />
              <AnswerBox label="Correct answer" value={question.correct_answer} correct={true} highlight />
            </View>
          )}

          {/* Writing / speaking — AI scored */}
          {isWritingOrSpeaking && (
            <View style={styles.aiNote}>
              <Ionicons name="sparkles" size={14} color="#6C47FF" />
              <Text style={styles.aiNoteText}>Scored by AI — see the Feedback tab for detailed breakdown.</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
};

const AnswerBox = ({ label, value, correct, highlight }) => (
  <View style={[styles.answerBox, highlight && styles.answerBoxHighlight]}>
    <Text style={styles.answerBoxLabel}>{label}</Text>
    <Text style={[styles.answerBoxValue, { color: correct ? '#10B981' : '#EF4444' }]}>{value}</Text>
  </View>
);

export default ReviewAnswersScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  headerSafe: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 16, fontWeight: '700', color: '#1A1B2F' },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: '#9299B8' },

  scroll: { padding: 16, gap: 12 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryPill:  { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: '#9299B8', fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  skillChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  skillDot:      { width: 6, height: 6, borderRadius: 3 },
  skillLabel:    { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  sectionScore:  { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#1A1B2F', marginRight: 4 },

  questionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  questionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resultIcon:  { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  questionNum: { fontSize: 12, fontWeight: '700', color: '#9299B8', marginTop: 4, flexShrink: 0 },
  questionText:{ flex: 1, fontSize: 14, color: '#1A1B2F', lineHeight: 20 },

  questionDetail: { marginTop: 14, gap: 10 },

  optionsList: { gap: 6 },
  optionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1.5 },
  optionLabel: { fontSize: 13, fontWeight: '700', width: 18 },
  optionText:  { flex: 1, fontSize: 13 },

  answerGrid: { flexDirection: 'row', gap: 10 },
  answerBox:  { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  answerBoxHighlight: { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
  answerBoxLabel: { fontSize: 10, fontWeight: '700', color: '#9299B8', marginBottom: 4, textTransform: 'uppercase' },
  answerBoxValue: { fontSize: 14, fontWeight: '700' },

  aiNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0EDFF', borderRadius: 10, padding: 10 },
  aiNoteText: { flex: 1, fontSize: 13, color: '#6C47FF' },
});
