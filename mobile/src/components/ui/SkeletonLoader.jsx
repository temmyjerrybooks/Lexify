import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const Shimmer = ({ width, height, borderRadius = 8, style }) => {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: isDark ? '#2A2A40' : '#E8ECEF' },
        animStyle,
        style,
      ]}
    />
  );
};

export const SkeletonCard = ({ style }) => {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.xl, borderColor: colors.cardBorder }, style]}>
      <View style={styles.row}>
        <Shimmer width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: 8 }}>
          <Shimmer width="70%" height={14} />
          <Shimmer width="45%" height={12} />
        </View>
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        <Shimmer width="100%" height={12} />
        <Shimmer width="85%" height={12} />
        <Shimmer width="60%" height={12} />
      </View>
      <Shimmer width="100%" height={44} borderRadius={12} style={{ marginTop: 16 }} />
    </View>
  );
};

export const SkeletonRow = ({ style }) => {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.rowItem, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.cardBorder }, style]}>
      <Shimmer width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Shimmer width="55%" height={13} />
        <Shimmer width="35%" height={11} />
      </View>
      <Shimmer width={24} height={24} borderRadius={12} />
    </View>
  );
};

export const SkeletonText = ({ lines = 3, style }) => (
  <View style={[{ gap: 8 }, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer key={i} width={i === lines - 1 ? '65%' : '100%'} height={13} />
    ))}
  </View>
);

export { Shimmer };

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
