import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressRing = ({
  score,           // e.g. 7.5
  maxScore = 9,
  size = 180,
  strokeWidth = 14,
  label = 'Overall Band Score',
  sublabel,
}) => {
  const { colors, isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    const target = score / maxScore;
    progress.value = withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00D4AA" />
            <Stop offset="40%" stopColor="#6C47FF" />
            <Stop offset="100%" stopColor="#EF4444" />
          </SvgGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={isDark ? '#2A2A40' : '#E8ECEF'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={cx} cy={cy} r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.score, { color: colors.text }]}>
          {score?.toFixed(1) ?? '—'}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{sublabel}</Text>
        )}
      </View>
    </View>
  );
};

export const SmallRing = ({ progress = 0, size = 40, strokeWidth = 4, color = '#6C47FF', children }) => {
  const { isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? '#2A2A40' : '#E8ECEF'} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  sublabel: { fontSize: 12, marginTop: 2 },
});
