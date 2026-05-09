import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet,
  Image, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { userAPI } from '../../services/api';
import { selectUser, updateUserProfile } from '../../store/slices/authSlice';

const EXAM_OPTIONS  = ['IELTS', 'TEF', 'TCF', 'DALF'];
const BAND_OPTIONS  = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];
const EXAM_COLORS   = { IELTS: '#4F46E5', TEF: '#10B981', TCF: '#7C3AED', DALF: '#EA580C' };

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const user       = useSelector(selectUser);

  const [fullName,    setFullName]    = useState(user?.full_name  || '');
  const [username,    setUsername]    = useState(user?.username   || '');
  const [targetExam,  setTargetExam]  = useState(user?.target_exam || '');
  const [targetBand,  setTargetBand]  = useState(user?.target_band ? String(user.target_band) : '');
  const [examDate,    setExamDate]    = useState(
    user?.exam_date ? user.exam_date.split('T')[0] : ''
  );
  const [avatarUri,   setAvatarUri]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const initials = (fullName || username || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation', 'Full name cannot be empty.');
      return;
    }
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      Alert.alert('Validation', 'Username must be 3-20 characters and contain only letters, numbers, or underscores.');
      return;
    }
    if (examDate && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      Alert.alert('Validation', 'Exam date must be in YYYY-MM-DD format (e.g. 2025-08-15).');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Upload avatar first if a new image was selected
      let newAvatarUrl = null;
      if (avatarUri) {
        setUploadingImg(true);
        const { data: avatarData } = await userAPI.uploadAvatar(avatarUri);
        newAvatarUrl = avatarData.avatar_url;
        setUploadingImg(false);
      }

      // Build update payload
      const updates = { full_name: fullName.trim() };
      if (username) updates.username = username.trim();
      if (targetExam) updates.target_exam = targetExam;
      if (targetBand) updates.target_band = parseFloat(targetBand);
      if (examDate) updates.exam_date = examDate;
      if (newAvatarUrl) updates.avatar_url = newAvatarUrl;

      const { data } = await userAPI.updateProfile(updates);
      dispatch(updateUserProfile(data.profile));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save profile. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
      setUploadingImg(false);
    }
  };

  const currentAvatar = avatarUri || user?.avatar_url;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#1A1B2F" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* Avatar */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.avatarSection}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              {currentAvatar ? (
                <Image source={{ uri: currentAvatar }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.avatarGrad}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingImg ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </Animated.View>

          {/* Basic Info */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#C4C9DF"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={[styles.input, styles.inputPrefixed]}
                  value={username}
                  onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  placeholderTextColor="#C4C9DF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <Text style={styles.inputHint}>Letters, numbers, underscores · 3-20 chars</Text>
            </View>
          </Animated.View>

          {/* Exam Goals */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Exam Goals</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Exam</Text>
              <View style={styles.pillRow}>
                {EXAM_OPTIONS.map(exam => {
                  const color = EXAM_COLORS[exam] || '#6C47FF';
                  const active = targetExam === exam;
                  return (
                    <Pressable
                      key={exam}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTargetExam(active ? '' : exam); }}
                      style={[styles.pill, active && { backgroundColor: color + '18', borderColor: color }]}
                    >
                      <Text style={[styles.pillText, active && { color, fontWeight: '700' }]}>{exam}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {targetExam && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.inputGroup}>
                <Text style={styles.label}>Target Band Score</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bandScroll}>
                  <View style={styles.pillRow}>
                    {BAND_OPTIONS.map(band => {
                      const active = targetBand === band;
                      return (
                        <Pressable
                          key={band}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTargetBand(active ? '' : band); }}
                          style={[styles.pill, styles.bandPill, active && styles.bandPillActive]}
                        >
                          <Text style={[styles.pillText, active && styles.bandPillTextActive]}>{band}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </Animated.View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exam Date</Text>
              <TextInput
                style={styles.input}
                value={examDate}
                onChangeText={setExamDate}
                placeholder="YYYY-MM-DD (e.g. 2025-08-15)"
                placeholderTextColor="#C4C9DF"
                keyboardType="numeric"
                returnKeyType="done"
                maxLength={10}
              />
              <Text style={styles.inputHint}>Leave blank if not yet scheduled</Text>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  flex:   { flex: 1 },

  headerSafe: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1B2F' },
  saveBtn:     { backgroundColor: '#6C47FF', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  scroll: { padding: 16, gap: 16 },

  avatarSection: { alignItems: 'center', paddingVertical: 12 },
  avatarWrap:    { position: 'relative', marginBottom: 10 },
  avatarImg:     { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#6C47FF' },
  avatarGrad:    { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#6C47FF' },
  avatarInitials:{ fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#6C47FF', borderWidth: 2, borderColor: '#F5F6FA',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: { fontSize: 13, color: '#9299B8' },

  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9299B8', letterSpacing: 0.8, textTransform: 'uppercase' },

  inputGroup: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: '#1A1B2F' },
  input: {
    backgroundColor: '#F5F6FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1B2F', borderWidth: 1, borderColor: '#E2E4F0',
  },
  inputWithPrefix: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 12, borderWidth: 1, borderColor: '#E2E4F0' },
  inputPrefix:     { paddingLeft: 14, fontSize: 15, color: '#9299B8', fontWeight: '600' },
  inputPrefixed:   { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  inputHint:       { fontSize: 12, color: '#9299B8' },

  pillRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#E2E4F0', backgroundColor: '#F9FAFB',
  },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  bandScroll: { marginHorizontal: -4 },
  bandPill:       { paddingHorizontal: 14 },
  bandPillActive: { backgroundColor: '#EEF0FF', borderColor: '#6C47FF' },
  bandPillTextActive: { color: '#6C47FF', fontWeight: '700' },
});
