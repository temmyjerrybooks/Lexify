import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Image,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { userAPI } from '../../services/api';
import { selectUser } from '../../store/slices/authSlice';
import { useAppTheme } from '../../theme/ThemeContext';

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const MEDAL_ICONS  = ['🥇', '🥈', '🥉'];

const LeaderboardScreen = () => {
  const user  = useSelector(selectUser);
  const theme = useAppTheme();
  const [scope, setScope] = useState('global');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => userAPI.getLeaderboard({ scope, limit: 50 }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const entries  = data?.entries || [];
  const myRank   = data?.my_rank;
  const myXP     = data?.my_xp || 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient colors={['#1A0A3E', '#0F0F1A']} style={styles.headerBg}>
        <SafeAreaView edges={['top']}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>Week of {getWeekLabel()}</Text>

            {/* My rank card */}
            <View style={styles.myRankCard}>
              <View style={styles.myRankLeft}>
                <Text style={styles.myRankNum}>#{myRank ?? '—'}</Text>
                <Text style={styles.myRankLabel}>{scope === 'global' ? 'Global' : 'Country'} Rank</Text>
              </View>
              <View style={styles.myRankDivider} />
              <View style={styles.myRankRight}>
                <Text style={styles.myXP}>{myXP.toLocaleString()}</Text>
                <Text style={styles.myXPLabel}>XP this week</Text>
              </View>
            </View>

            {/* Scope toggle */}
            <View style={styles.scopeToggle}>
              {['global', 'country'].map(s => (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScope(s); }}
                  style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
                >
                  <Ionicons
                    name={s === 'global' ? 'globe-outline' : 'flag-outline'}
                    size={14}
                    color={scope === s ? '#6C47FF' : 'rgba(255,255,255,0.5)'}
                  />
                  <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
                    {s === 'global' ? 'Global' : 'My Country'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {/* Top 3 podium */}
      {!isLoading && entries.length >= 3 && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.podium}>
          <PodiumEntry entry={entries[1]} place={2} />
          <PodiumEntry entry={entries[0]} place={1} />
          <PodiumEntry entry={entries[2]} place={3} />
        </Animated.View>
      )}

      {/* Ranked list */}
      <FlatList
        data={entries.slice(3)}
        keyExtractor={(_, i) => String(i + 4)}
        refreshing={isLoading}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>No rankings yet</Text>
              <Text style={styles.emptySub}>Complete exams this week to appear on the leaderboard.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: entry, index }) => {
          const rank = index + 4;
          const isMe = entry.profiles?.username === user?.username;
          return (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
              <View style={[styles.rowCard, { backgroundColor: theme.card }, isMe && styles.rowCardMe]}>
                <Text style={[styles.rowRank, isMe && { color: '#6C47FF' }]}>#{rank}</Text>
                <Avatar profile={entry.profiles} size={36} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, isMe && { color: '#6C47FF' }]} numberOfLines={1}>
                    {entry.profiles?.full_name || entry.profiles?.username || 'Anonymous'}
                    {isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.rowExams}>{entry.exams_completed} exam{entry.exams_completed !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={[styles.rowXP, isMe && { color: '#6C47FF' }]}>
                  {(entry.xp_earned || 0).toLocaleString()} XP
                </Text>
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
};

const PodiumEntry = ({ entry, place }) => {
  const heights = { 1: 90, 2: 70, 3: 60 };
  const isFirst = place === 1;
  return (
    <View style={[styles.podiumEntry, isFirst && { marginBottom: 0 }]}>
      <Text style={styles.podiumMedal}>{MEDAL_ICONS[place - 1]}</Text>
      <Avatar profile={entry.profiles} size={isFirst ? 52 : 44} />
      <Text style={styles.podiumName} numberOfLines={1}>
        {entry.profiles?.full_name?.split(' ')[0] || entry.profiles?.username || '?'}
      </Text>
      <Text style={styles.podiumXP}>{(entry.xp_earned || 0).toLocaleString()}</Text>
      <View style={[styles.podiumBar, { height: heights[place], backgroundColor: MEDAL_COLORS[place - 1] + (isFirst ? 'FF' : '99') }]}>
        <Text style={styles.podiumRank}>#{place}</Text>
      </View>
    </View>
  );
};

const Avatar = ({ profile, size }) => {
  const initials = (profile?.full_name || profile?.username || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return profile?.avatar_url ? (
    <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <LinearGradient
      colors={['#8B6EFF', '#6C47FF']}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: '800', color: '#fff' }}>{initials}</Text>
    </LinearGradient>
  );
};

const getWeekLabel = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now); monday.setDate(diff);
  return monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  headerBg:      { paddingBottom: 20 },
  headerContent: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title:         { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 2 },
  subtitle:      { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },

  myRankCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 16, width: '100%', marginBottom: 16, gap: 0,
  },
  myRankLeft:  { flex: 1, alignItems: 'center' },
  myRankNum:   { fontSize: 28, fontWeight: '900', color: '#fff' },
  myRankLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  myRankDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  myRankRight: { flex: 1, alignItems: 'center' },
  myXP:        { fontSize: 28, fontWeight: '900', color: '#FFD700' },
  myXPLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  scopeToggle:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: 4, gap: 4 },
  scopeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  scopeBtnActive: { backgroundColor: '#fff' },
  scopeText:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  scopeTextActive:{ color: '#1A1B2F' },

  podium:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  podiumEntry: { alignItems: 'center', flex: 1 },
  podiumMedal: { fontSize: 22, marginBottom: 4 },
  podiumName:  { fontSize: 12, fontWeight: '700', color: '#1A1B2F', marginTop: 6, marginBottom: 2, maxWidth: 80, textAlign: 'center' },
  podiumXP:    { fontSize: 11, color: '#9299B8', marginBottom: 4 },
  podiumBar:   { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  podiumRank:  { fontSize: 16, fontWeight: '900', color: '#fff' },

  list: { padding: 16, paddingTop: 4, gap: 8, paddingBottom: 110 },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rowCardMe:  { borderWidth: 1.5, borderColor: '#6C47FF', backgroundColor: '#F8F6FF' },
  rowRank:    { fontSize: 14, fontWeight: '800', color: '#9299B8', width: 30, textAlign: 'center' },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 14, fontWeight: '600', color: '#1A1B2F', marginBottom: 2 },
  rowExams:   { fontSize: 12, color: '#9299B8' },
  rowXP:      { fontSize: 14, fontWeight: '800', color: '#1A1B2F' },

  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1B2F', marginBottom: 6 },
  emptySub:   { fontSize: 14, color: '#9299B8', textAlign: 'center', lineHeight: 20 },
});
