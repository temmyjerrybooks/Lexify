import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const COPY = {
  default:         { title: 'Unlock Full Access',           body: 'Get unlimited exams, AI scoring & detailed insights.',  cta: 'Upgrade Now' },
  mock_limit:      { title: "You've reached your free limit", body: 'Upgrade to continue full exam simulation.',            cta: 'Upgrade to Continue' },
  writing_unlock:  { title: 'See How to Reach Band 7+',     body: 'Unlock grammar corrections & AI-improved answers.',     cta: 'Unlock AI Feedback' },
  speaking_unlock: { title: 'Your Speaking Score Is Ready', body: 'Unlock full AI feedback, fluency & pronunciation tips.', cta: 'See Full Feedback' },
  insights:        { title: 'Want to Improve Faster?',      body: 'Get a personalized plan and full weakness breakdown.',   cta: 'Unlock Full Insights' },
  advanced:        { title: 'Advanced Questions',           body: 'Designed for Band 8+ — unlock with Pro.',               cta: 'Go Pro' },
};

export const ProBanner = ({
  context = 'default',
  onUpgrade,
  onDismiss,
  compact = false,
  style,
}) => {
  const { isDark, radius } = useTheme();
  const copy = COPY[context] || COPY.default;

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade?.();
  };

  if (compact) {
    return (
      <Pressable onPress={handleUpgrade} style={[style]}>
        <LinearGradient
          colors={['rgba(108,71,255,0.15)', 'rgba(108,71,255,0.05)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.compact, { borderRadius: radius.lg }]}
        >
          <View style={styles.compactLeft}>
            <Ionicons name="flash" size={16} color="#6C47FF" />
            <Text style={styles.compactText}>{copy.title}</Text>
          </View>
          <Text style={styles.compactCta}>{copy.cta} →</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={[{ borderRadius: radius.xl, overflow: 'hidden' }, style]}>
      <BlurView intensity={isDark ? 50 : 70} tint={isDark ? 'dark' : 'light'}>
        <LinearGradient
          colors={['rgba(108,71,255,0.2)', 'rgba(59,36,180,0.15)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* Gradient border */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(108,71,255,0.35)' }]} />

          <View style={styles.iconRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="flash" size={18} color="#fff" />
            </View>
            {onDismiss && (
              <Pressable onPress={onDismiss} hitSlop={12}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}
          </View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>

          <Pressable onPress={handleUpgrade} style={styles.ctaButton}>
            <LinearGradient
              colors={['#8B6EFF', '#6C47FF']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{copy.cta}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { padding: 20 },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 16 },
  ctaButton: { alignSelf: 'flex-start' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  compact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: 'rgba(108,71,255,0.2)' },
  compactLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactText: { fontSize: 13, fontWeight: '600', color: '#6C47FF' },
  compactCta: { fontSize: 12, fontWeight: '700', color: '#6C47FF' },
});
