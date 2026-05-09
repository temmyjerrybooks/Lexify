import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card = ({
  children,
  variant = 'default',  // default | glow | glass | flat
  onPress,
  style,
  padding = 16,
}) => {
  const { colors, radius, shadow, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    if (!onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const baseStyle = [
    styles.card,
    { borderRadius: radius.xl, padding },
    variant === 'default' && {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...shadow.sm,
    },
    variant === 'glow' && {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: 'rgba(108,71,255,0.3)',
      ...shadow.glow,
    },
    variant === 'flat' && {
      backgroundColor: colors.backgroundAlt,
    },
    style,
  ];

  if (variant === 'glass') {
    return (
      <Animated.View style={[animatedStyle, { borderRadius: radius.xl, overflow: 'hidden' }, style]}>
        <AnimatedPressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} disabled={!onPress}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.card, { padding }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(108,71,255,0.08)' : 'rgba(255,255,255,0.6)', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(108,71,255,0.2)' }]} />
            {children}
          </BlurView>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={handlePress}
        style={[baseStyle, animatedStyle]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[baseStyle, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
});
