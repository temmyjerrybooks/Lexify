import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { MCQOption } from '../ui/MCQOption';
import ChartRenderer from './ChartRenderer';

const QUESTION_TYPE_LABELS = {
  MULTIPLE_CHOICE:      'Multiple Choice',
  TRUE_FALSE_NOT_GIVEN: 'True / False / Not Given',
  FILL_IN_BLANK:        'Fill in the Blank',
  MATCHING:             'Matching',
  SHORT_ANSWER:         'Short Answer',
  ESSAY:                'Essay',
  SPEAKING_RESPONSE:    'Speaking',
};

const QuestionCard = ({ question, selectedAnswer, onAnswerSelect }) => {
  if (!question) return null;

  const isMCQ      = ['MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'MATCHING'].includes(question.question_type);
  const isTextInput = ['FILL_IN_BLANK', 'SHORT_ANSWER'].includes(question.question_type);
  const typeLabel   = QUESTION_TYPE_LABELS[question.question_type] || question.question_type;

  return (
    <View style={styles.card}>
      <View style={styles.typeBadge}>
        <Text style={styles.typeText}>{typeLabel}</Text>
      </View>

      <Text style={styles.questionText}>{question.question_text}</Text>

      {question.chart_data && (
        <ChartRenderer chartData={question.chart_data} />
      )}

      {isMCQ && question.options && (
        <View style={styles.options}>
          {question.options.map((option, i) => (
            <MCQOption
              key={option.label || i}
              index={i}
              text={option.text}
              selected={selectedAnswer === option.label}
              correct={null}
              onPress={() => onAnswerSelect(option.label)}
            />
          ))}
        </View>
      )}

      {isTextInput && (
        <TextInput
          style={[styles.textInput, selectedAnswer && styles.textInputFilled]}
          placeholder="Type your answer here…"
          placeholderTextColor="#C4C9DF"
          value={selectedAnswer || ''}
          onChangeText={onAnswerSelect}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
        />
      )}
    </View>
  );
};

export default QuestionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0EDFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 14,
  },
  typeText: { fontSize: 11, fontWeight: '700', color: '#6C47FF', letterSpacing: 0.5 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#1A1B2F', lineHeight: 25, marginBottom: 20 },
  options: { gap: 0 },
  textInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1A1B2F',
    backgroundColor: '#F9FAFB', minHeight: 52,
  },
  textInputFilled: { borderColor: '#6C47FF', backgroundColor: 'rgba(108,71,255,0.04)' },
});
