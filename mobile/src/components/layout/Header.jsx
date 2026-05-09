import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

export const Header = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  right,           // JSX element for right side
  transparent = false,
  light = false,   // force light text (for dark backgrounds)
  style,
}) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const isLight = light || isDark;
  const textColor = isLight ? '#fff' : colors.text;
  const iconColor = isLight ? 'rgba(255,255,255,0.8)' : colors.text;
  const bg = transparent ? 'transparent' : (isDark ? colors.background : '#fff');

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) onBack();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.header, { backgroundColor: bg }, style]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={iconColor} />
          </Pressable>
        )}
      </View>

      <View style={styles.center}>
        {title ? (
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{title}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: isLight ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {right ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

export const HomeHeader = ({ name, avatarUrl, onNotification, style }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.homeHeader, style]}>
      <View>
        <Text style={[styles.greeting, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.homeName, { color: colors.text }]} numberOfLines={1}>
          {name ? `${name} 👋` : 'Welcome back 👋'}
        </Text>
      </View>
      <Pressable onPress={onNotification} hitSlop={10} style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  left: { width: 40, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center' },
  right: { width: 40, alignItems: 'flex-end' },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 1 },
  placeholder: { width: 36 },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  homeName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
});
