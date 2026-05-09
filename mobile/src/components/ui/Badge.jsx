import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

const EXAM_STYLES = {
  IELTS: { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  TEF:   { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  TCF:   { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  DALF:  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
};

const SKILL_COLORS = {
  LISTENING: '#6C47FF',
  READING:   '#EF4444',
  WRITING:   '#10B981',
  SPEAKING:  '#F59E0B',
};

const STATUS_STYLES = {
  free:       { bg: '#ECFDF5', text: '#065F46' },
  pro:        { bg: '#EEF2FF', text: '#3730A3' },
  premium:    { bg: '#FFFBEB', text: '#92400E' },
  processing: { bg: '#FEF3C7', text: '#92400E' },
  completed:  { bg: '#D1FAE5', text: '#065F46' },
  failed:     { bg: '#FEE2E2', text: '#991B1B' },
};

export const Badge = ({ type, label, size = 'sm', style }) => {
  const { isDark } = useTheme();

  let bg, textColor, border;

  if (EXAM_STYLES[type]) {
    ({ bg, text: textColor, border } = EXAM_STYLES[type]);
  } else if (SKILL_COLORS[type]) {
    bg = `${SKILL_COLORS[type]}20`;
    textColor = SKILL_COLORS[type];
    border = `${SKILL_COLORS[type]}40`;
  } else if (STATUS_STYLES[type]) {
    ({ bg, text: textColor } = STATUS_STYLES[type]);
  } else {
    bg = isDark ? '#2A2A40' : '#F0F1F8';
    textColor = isDark ? '#9299B8' : '#636B8A';
  }

  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 13;
  const paddingH = size === 'xs' ? 6 : size === 'sm' ? 8 : 12;
  const paddingV = size === 'xs' ? 2 : size === 'sm' ? 3 : 5;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: bg, borderColor: border || bg, paddingHorizontal: paddingH, paddingVertical: paddingV },
      style,
    ]}>
      <Text style={[styles.text, { color: textColor, fontSize }]}>
        {label || type}
      </Text>
    </View>
  );
};

export const SkillDot = ({ skill, size = 10 }) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    backgroundColor: SKILL_COLORS[skill] || '#6C47FF',
  }} />
);

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
