import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { selectSubscriptionTier } from '../../store/slices/authSlice';

const PLANS = [
  {
    tier: 'PRO',
    name: 'Pro',
    emoji: '⭐',
    monthly: '$7.99',
    yearly:  '$59.99',
    monthlyAfrica: '₦2,500',
    yearlyAfrica:  '₦18,000',
    savePct: '37',
    gradient: ['#8B6EFF', '#6C47FF'],
    popular: true,
    features: [
      { icon: 'infinite-outline',       text: 'Unlimited mock exams' },
      { icon: 'chatbubble-ellipses-outline', text: 'Unlimited AI writing & speaking feedback' },
      { icon: 'school-outline',         text: 'All 4 exam types (IELTS, TEF, TCF, DALF)' },
      { icon: 'bar-chart-outline',      text: 'Full progress analytics & insights' },
      { icon: 'trophy-outline',         text: 'Country leaderboards' },
      { icon: 'flame-outline',          text: 'Streak freeze tokens' },
      { icon: 'cloud-download-outline', text: 'Offline mode' },
    ],
  },
  {
    tier: 'ELITE',
    name: 'Elite',
    emoji: '💎',
    monthly: '$19.99',
    yearly:  '$149.99',
    monthlyAfrica: '₦6,500',
    yearlyAfrica:  '₦48,000',
    savePct: '37',
    gradient: ['#F59E0B', '#D97706'],
    popular: false,
    features: [
      { icon: 'checkmark-circle-outline', text: 'Everything in Pro' },
      { icon: 'sparkles-outline',         text: 'AI tutor chat (unlimited sessions)' },
      { icon: 'map-outline',              text: 'Personalized study plan' },
      { icon: 'analytics-outline',        text: 'Band score prediction model' },
      { icon: 'flash-outline',            text: 'Priority AI responses' },
      { icon: 'ribbon-outline',           text: 'Certificate of completion' },
      { icon: 'star-outline',             text: 'Early access to new features' },
    ],
  },
];

const COMPARE = [
  { label: 'Mock exams',           free: '5/mo',       pro: 'Unlimited',  elite: 'Unlimited' },
  { label: 'AI writing scoring',   free: '3/mo',       pro: 'Unlimited',  elite: 'Unlimited' },
  { label: 'AI speaking scoring',  free: false,        pro: true,         elite: true },
  { label: 'Exam types',           free: 'IELTS only', pro: 'All 4',     elite: 'All 4' },
  { label: 'AI tutor chat',        free: false,        pro: false,        elite: true },
  { label: 'Offline mode',         free: false,        pro: true,         elite: true },
  { label: 'Leaderboards',         free: false,        pro: true,         elite: true },
];

const SubscriptionScreen = () => {
  const navigation   = useNavigation();
  const currentTier  = useSelector(selectSubscriptionTier);
  const [cycle, setCycle] = useState('monthly');

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Linking.openURL('https://examify.app/upgrade');
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Upgrade Plan</Text>
            <View style={{ width: 36 }} />
          </View>
          <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
            <Text style={styles.heroEmoji}>🚀</Text>
            <Text style={styles.heroTitle}>Unlock Your Potential</Text>
            <Text style={styles.heroSub}>AI-powered feedback and unlimited practice to get your target band</Text>

            {/* Billing toggle */}
            <View style={styles.toggle}>
              {['monthly', 'yearly'].map(c => (
                <Pressable
                  key={c}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCycle(c); }}
                  style={[styles.toggleBtn, cycle === c && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, cycle === c && styles.toggleTextActive]}>
                    {c === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>
                  {c === 'yearly' && <View style={styles.saveBadge}><Text style={styles.saveText}>-37%</Text></View>}
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Plan cards */}
        {PLANS.map((plan, idx) => {
          const isCurrent = currentTier === plan.tier;
          const price     = cycle === 'yearly' ? plan.yearly : plan.monthly;
          const africa    = cycle === 'yearly' ? plan.yearlyAfrica : plan.monthlyAfrica;
          const period    = cycle === 'yearly' ? '/year' : '/month';

          return (
            <Animated.View key={plan.tier} entering={FadeInDown.delay(100 + idx * 120).duration(400)}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>⭐ MOST POPULAR</Text>
                </View>
              )}
              <LinearGradient colors={plan.gradient} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
                <View style={styles.planTop}>
                  <View>
                    <Text style={styles.planEmoji}>{plan.emoji}</Text>
                    <Text style={styles.planName}>{plan.name}</Text>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={styles.planPrice}>{price}</Text>
                    <Text style={styles.planPeriod}>{period}</Text>
                    <Text style={styles.planAfrica}>{africa}</Text>
                  </View>
                </View>

                <View style={styles.featureList}>
                  {plan.features.map(f => (
                    <View key={f.text} style={styles.featureRow}>
                      <View style={styles.featureIconWrap}>
                        <Ionicons name={f.icon} size={14} color="rgba(255,255,255,0.9)" />
                      </View>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <View style={styles.currentBtn}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.currentBtnText}>Your current plan</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleSubscribe}
                    style={({ pressed }) => [styles.subscribeBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={[styles.subscribeBtnText, { color: plan.gradient[0] }]}>
                      Get {plan.name} →
                    </Text>
                  </Pressable>
                )}
              </LinearGradient>
            </Animated.View>
          );
        })}

        {/* Comparison table */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.tableCard}>
          <Text style={styles.tableTitle}>Full Comparison</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableLabelCell, { color: '#9299B8' }]}>Feature</Text>
            <Text style={[styles.tableCell, { color: '#9299B8', textAlign: 'center' }]}>Free</Text>
            <Text style={[styles.tableCell, { color: '#6C47FF', fontWeight: '700', textAlign: 'center' }]}>Pro</Text>
            <Text style={[styles.tableCell, { color: '#D97706', fontWeight: '700', textAlign: 'center' }]}>Elite</Text>
          </View>
          {COMPARE.map((row, i) => (
            <View key={row.label} style={[styles.tableRow, i === 0 && { borderTopWidth: 0 }]}>
              <Text style={[styles.tableCell, styles.tableLabelCell, { color: '#1A1B2F' }]}>{row.label}</Text>
              {[row.free, row.pro, row.elite].map((val, j) => (
                <View key={j} style={[styles.tableCell, { alignItems: 'center' }]}>
                  {val === true  && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                  {val === false && <Ionicons name="close-circle"     size={16} color="#E5E7EB" />}
                  {typeof val === 'string' && <Text style={styles.tableVal}>{val}</Text>}
                </View>
              ))}
            </View>
          ))}
        </Animated.View>

        {/* Guarantee */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.guarantee}>
          <Ionicons name="lock-closed-outline" size={16} color="#9299B8" />
          <Text style={styles.guaranteeText}>Cancel anytime · 7-day money-back guarantee · Secure payment</Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  headerBg: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backBtn:   { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  heroSection: { alignItems: 'center', paddingHorizontal: 24 },
  heroEmoji:   { fontSize: 40, marginBottom: 10 },
  heroTitle:   { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  heroSub:     { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  toggle:          { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: 4, gap: 4 },
  toggleBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleText:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  toggleTextActive:{ color: '#1A1B2F' },
  saveBadge:       { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  saveText:        { fontSize: 10, fontWeight: '700', color: '#fff' },

  scroll: { padding: 16, gap: 14 },

  popularBadge: { backgroundColor: '#F59E0B', borderRadius: 10, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, marginBottom: -4, zIndex: 1 },
  popularText:  { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planCard:        { borderRadius: 22, padding: 22, gap: 16 },
  planCardPopular: { shadowColor: '#6C47FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },

  planTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planEmoji:    { fontSize: 26, marginBottom: 4 },
  planName:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  planPriceCol: { alignItems: 'flex-end' },
  planPrice:    { fontSize: 32, fontWeight: '900', color: '#fff' },
  planPeriod:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: -2 },
  planAfrica:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  featureList: { gap: 10 },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIconWrap:{ width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  featureText:    { fontSize: 13, color: 'rgba(255,255,255,0.9)', flex: 1 },

  subscribeBtn:     { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  subscribeBtnText: { fontSize: 15, fontWeight: '800' },
  currentBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 14 },
  currentBtnText:   { fontSize: 14, fontWeight: '600', color: '#fff' },

  tableCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tableTitle: { fontSize: 16, fontWeight: '700', color: '#1A1B2F', padding: 16, paddingBottom: 12 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10 },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F5F6FA' },
  tableCell:   { flex: 1 },
  tableLabelCell: { flex: 2, fontSize: 13 },
  tableVal:    { fontSize: 12, color: '#1A1B2F', fontWeight: '500', textAlign: 'center' },

  guarantee:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  guaranteeText: { fontSize: 12, color: '#9299B8', textAlign: 'center', lineHeight: 18 },
});
