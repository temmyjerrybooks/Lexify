import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZES = {
  sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, borderRadius: 12 },
  md: { paddingVertical: 15, paddingHorizontal: 20, fontSize: 16, borderRadius: 14 },
  lg: { paddingVertical: 17, paddingHorizontal: 24, fontSize: 17, borderRadius: 16 },
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const { colors, gradients } = useTheme();
  const scale = useSharedValue(1);
  const s = SIZES[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const inner = loading ? (
    <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#fff'} size="small" />
  ) : (
    <View style={styles.row}>
      {icon}
      <Text style={[
        styles.label,
        { fontSize: s.fontSize },
        variant === 'ghost' && { color: colors.primary },
        variant === 'secondary' && { color: colors.text },
        variant === 'danger' && { color: '#fff' },
        variant === 'primary' && { color: '#fff' },
        textStyle,
      ]}>
        {title}
      </Text>
    </View>
  );

  const containerStyle = [
    animatedStyle,
    fullWidth && { width: '100%' },
    { opacity: disabled ? 0.45 : 1 },
    style,
  ];

  if (variant === 'primary') {
    return (
      <Animated.View style={containerStyle}>
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} disabled={disabled || loading}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.base, { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal, borderRadius: s.borderRadius }]}
          >
            {inner}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  const variantStyle = {
    ghost: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
    secondary: { backgroundColor: colors.backgroundAlt },
    danger: { backgroundColor: '#FF4757' },
  }[variant] || {};

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal, borderRadius: s.borderRadius },
        variantStyle,
        animatedStyle,
        fullWidth && { width: '100%' },
        { opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {inner}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '700', letterSpacing: 0.2 },
});
