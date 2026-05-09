import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const MCQOption = ({
  index,
  text,
  selected = false,
  correct,          // true | false | null (null = not yet revealed)
  onPress,
  disabled = false,
}) => {
  const { colors, radius, isDark } = useTheme();
  const scale = useSharedValue(1);

  const isRevealed = correct !== null && correct !== undefined;
  const isCorrect = isRevealed && correct === true;
  const isWrong = isRevealed && selected && correct === false;

  const onPressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    if (disabled) return;
    if (isWrong) {
      // Shake animation on wrong answer
      scale.value = withSequence(
        withTiming(1.02, { duration: 60 }),
        withTiming(0.97, { duration: 60 }),
        withTiming(1.02, { duration: 60 }),
        withTiming(1, { duration: 60 }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(index);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Determine colors
  let borderColor = isDark ? '#2A2A40' : '#E8ECEF';
  let bgColor = isDark ? colors.card : '#FFFFFF';
  let letterBg = isDark ? '#2A2A40' : '#F0F1F8';
  let letterColor = colors.textSecondary;
  let textColor = colors.text;

  if (selected && !isRevealed) {
    borderColor = '#6C47FF';
    bgColor = 'rgba(108,71,255,0.08)';
    letterBg = '#6C47FF';
    letterColor = '#fff';
  }
  if (isCorrect) {
    borderColor = '#10B981';
    bgColor = 'rgba(16,185,129,0.08)';
    letterBg = '#10B981';
    letterColor = '#fff';
    textColor = '#10B981';
  }
  if (isWrong) {
    borderColor = '#EF4444';
    bgColor = 'rgba(239,68,68,0.08)';
    letterBg = '#EF4444';
    letterColor = '#fff';
    textColor = '#EF4444';
  }

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.option,
        {
          borderColor,
          backgroundColor: bgColor,
          borderRadius: radius.lg,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.letter, { backgroundColor: letterBg, borderRadius: 999 }]}>
        <Text style={[styles.letterText, { color: letterColor }]}>{LETTERS[index]}</Text>
      </View>
      <Text style={[styles.text, { color: textColor, flex: 1 }]}>{text}</Text>
      {isCorrect && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
      {isWrong && <Ionicons name="close-circle" size={20} color="#EF4444" />}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    marginVertical: 5,
  },
  letter: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: { fontSize: 14, fontWeight: '700' },
  text: { fontSize: 15, lineHeight: 22 },
});
