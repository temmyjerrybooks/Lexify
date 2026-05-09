import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const SKILL_COLORS = {
  LISTENING: '#6C47FF',
  READING:   '#EF4444',
  WRITING:   '#10B981',
  SPEAKING:  '#F59E0B',
};

export const ProgressBar = ({
  progress = 0,    // 0–1
  color,
  skill,           // LISTENING | READING | WRITING | SPEAKING (auto-colors)
  height = 6,
  showLabel = false,
  label,
  animated = true,
  style,
}) => {
  const { colors } = useTheme();
  const width = useSharedValue(0);

  const barColor = color || (skill ? SKILL_COLORS[skill] : colors.primary);

  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 1);
    if (animated) {
      width.value = withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) });
    } else {
      width.value = target;
    }
  }, [progress]);

  const animatedBar = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={style}>
      {(showLabel || label) && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label || skill}</Text>
          <Text style={[styles.label, { color: colors.text, fontWeight: '600' }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: colors.divider, borderRadius: height }]}>
        <Animated.View style={[styles.fill, animatedBar, { backgroundColor: barColor, borderRadius: height }]} />
      </View>
    </View>
  );
};

export const ScoreProgressBar = ({ skill, score, maxScore = 9, style }) => {
  const { colors } = useTheme();
  const progress = score / maxScore;
  const color = SKILL_COLORS[skill] || colors.primary;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [score]);

  const animatedBar = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={[styles.scoreRow, style]}>
      <View style={styles.scoreLeft}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.skillName, { color: colors.text }]}>
          {skill.charAt(0) + skill.slice(1).toLowerCase()}
        </Text>
      </View>
      <View style={styles.trackWide}>
        <View style={[styles.track, { height: 6, backgroundColor: colors.divider, borderRadius: 3, flex: 1 }]}>
          <Animated.View style={[styles.fill, animatedBar, { backgroundColor: color, borderRadius: 3 }]} />
        </View>
      </View>
      <Text style={[styles.scoreValue, { color: colors.text }]}>{score?.toFixed(1) ?? '—'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  skillName: { fontSize: 14, fontWeight: '500' },
  trackWide: { flex: 1 },
  scoreValue: { fontSize: 14, fontWeight: '700', width: 32, textAlign: 'right' },
});
