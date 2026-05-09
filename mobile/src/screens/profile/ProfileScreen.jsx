import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Image, Modal,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { logoutUser, selectUser, selectSubscriptionTier } from '../../store/slices/authSlice';
import { setThemePreference, selectThemePreference } from '../../store/slices/themeSlice';
import { useAppTheme } from '../../theme/ThemeContext';

const EXAM_COLORS = {
  IELTS: '#4F46E5',
  TEF:   '#10B981',
  TCF:   '#7C3AED',
  DALF:  '#EA580C',
};

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  icon: 'sunny-outline' },
  { value: 'dark',   label: 'Dark',   icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const ProfileScreen = () => {
  const navigation       = useNavigation();
  const dispatch         = useDispatch();
  const user             = useSelector(selectUser);
  const tier             = useSelector(selectSubscriptionTier);
  const themePreference  = useSelector(selectThemePreference);
  const theme            = useAppTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isPro  = tier === 'PRO' || tier === 'ELITE';
  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  const soon = () => Alert.alert('Coming Soon', 'This feature is coming soon!');

  const currentThemeLabel = THEME_OPTIONS.find(o => o.value === themePreference)?.label || 'System';

  const MENU_ITEMS = [
    { icon: 'person-circle-outline', label: 'Edit Profile',            onPress: () => navigation.navigate('EditProfile') },
    { icon: 'card-outline',          label: 'Subscription & Billing',  onPress: () => navigation.navigate('Subscription'), badge: tier !== 'FREE' ? tier : null },
    { icon: 'contrast-outline',      label: 'Appearance',              onPress: () => setShowThemePicker(true), badge: currentThemeLabel },
    { icon: 'notifications-outline', label: 'Notifications',           onPress: soon },
    { icon: 'language-outline',      label: 'Exam Preferences',        onPress: soon },
    { icon: 'people-outline',        label: 'Refer a Friend',          onPress: soon, badge: 'Free token' },
    { icon: 'help-circle-outline',   label: 'Help & Support',          onPress: soon },
    { icon: 'document-text-outline', label: 'Privacy Policy',          onPress: soon },
    { icon: 'log-out-outline',       label: 'Log Out',                 onPress: handleLogout, danger: true },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Dark gradient header ── */}
        <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.headerBg}>
          <SafeAreaView edges={['top']}>
            <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>

              {/* Avatar */}
              <View style={styles.avatarRing}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.avatarGrad}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </LinearGradient>
                )}
              </View>

              <Text style={styles.name}>{user?.full_name || user?.username || 'Student'}</Text>
              <Text style={styles.email}>{user?.email || '@' + (user?.username || 'user')}</Text>

              {/* Tier badge */}
              {isPro ? (
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.proBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.proBadgeText}>
                    {tier === 'ELITE' ? 'Elite Member' : 'Pro Member'}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Free Plan</Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatPill value={user?.total_exams_completed ?? 0} label="Tests" />
                <View style={styles.statDivider} />
                <StatPill value={user?.best_score ?? '—'} label="Best Band" />
                <View style={styles.statDivider} />
                <StatPill value={user?.total_xp ?? 0} label="XP" />
              </View>

            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Target exam card ── */}
        {user?.target_exam && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.targetCard}>
            <Text style={styles.targetLabel}>PREPARING FOR</Text>
            <View style={styles.targetRow}>
              <View style={[styles.examBadge, { backgroundColor: (EXAM_COLORS[user.target_exam] || '#6C47FF') + '20' }]}>
                <Text style={[styles.examBadgeText, { color: EXAM_COLORS[user.target_exam] || '#6C47FF' }]}>
                  {user.target_exam}
                </Text>
              </View>
              {user.target_band && (
                <Text style={styles.targetBand}>Target Band {user.target_band}</Text>
              )}
              {user.exam_date && (
                <Text style={styles.examDate}>
                  📅 {new Date(user.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Upgrade banner (free users) ── */}
        {!isPro && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginHorizontal: 16, marginBottom: 14 }}>
            <Pressable onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.upgradeBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View style={styles.upgradeLeft}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <View>
                    <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                    <Text style={styles.upgradeSub}>Unlimited exams · AI feedback · All 4 types</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Menu items ── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.onPress(); }}
              style={({ pressed }) => [
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && styles.menuBorder,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.danger ? '#FEE2E2' : '#F0EDFF' }]}>
                <Ionicons name={item.icon} size={18} color={item.danger ? '#EF4444' : '#6C47FF'} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.text }, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                {!item.danger && <Ionicons name="chevron-forward" size={16} color="#C4C9DF" />}
              </View>
            </Pressable>
          ))}
        </Animated.View>

        <Text style={[styles.version, { color: theme.textMuted }]}>Examify v1.0.0</Text>
      </ScrollView>

      {/* ── Appearance / Theme Picker Modal ── */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowThemePicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Appearance</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Choose how Examify looks</Text>

            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map(opt => {
                const active = themePreference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      dispatch(setThemePreference(opt.value));
                      setShowThemePicker(false);
                    }}
                    style={[
                      styles.themeOption,
                      { backgroundColor: theme.background, borderColor: active ? '#6C47FF' : theme.border },
                      active && styles.themeOptionActive,
                    ]}
                  >
                    <View style={[styles.themeIconWrap, { backgroundColor: active ? '#EEF0FF' : theme.cardAlt }]}>
                      <Ionicons name={opt.icon} size={22} color={active ? '#6C47FF' : theme.textSecondary} />
                    </View>
                    <Text style={[styles.themeOptionLabel, { color: active ? '#6C47FF' : theme.text }]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={18} color="#6C47FF" style={styles.themeCheck} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const StatPill = ({ value, label }) => (
  <View style={styles.statPill}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default ProfileScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  headerBg: { paddingBottom: 28 },
  headerContent: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 24 },

  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 3, borderColor: '#6C47FF',
    marginBottom: 14, overflow: 'hidden',
  },
  avatar:      { width: '100%', height: '100%' },
  avatarGrad:  { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },

  name:  { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 12 },

  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 20 },
  proBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  freeBadge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 20 },
  freeBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statPill:    { alignItems: 'center', paddingHorizontal: 24 },
  statValue:   { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  targetCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: -1, marginBottom: 14,
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  targetLabel: { fontSize: 11, fontWeight: '700', color: '#9299B8', letterSpacing: 1, marginBottom: 8 },
  targetRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  examBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  examBadgeText: { fontSize: 12, fontWeight: '700' },
  targetBand:  { fontSize: 14, fontWeight: '600', color: '#1A1B2F' },
  examDate:    { fontSize: 13, color: '#9299B8' },

  upgradeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 16 },
  upgradeLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeTitle:  { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  upgradeSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  menuCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  menuItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuBorder:    { borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  menuIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel:     { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1B2F' },
  menuLabelDanger: { color: '#EF4444' },
  menuRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge:     { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },

  version: { fontSize: 12, color: '#C4C9DF', textAlign: 'center', marginTop: 4, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#C4C9DF', alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSub:     { fontSize: 14, marginBottom: 24 },

  themeOptions:     { gap: 12 },
  themeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, borderWidth: 1.5,
  },
  themeOptionActive: { borderColor: '#6C47FF' },
  themeIconWrap:    { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  themeOptionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  themeCheck:       { marginLeft: 'auto' },
});
