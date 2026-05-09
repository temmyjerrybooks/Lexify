import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authAPI } from '../../services/api';
import { Button } from '../../components/ui';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [sent,      setSent]      = useState(false);
  const [focused,   setFocused]   = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Dark gradient header */}
      <LinearGradient colors={['#1A0A3E', '#0D0828']} style={styles.topGrad}>
        <SafeAreaView edges={['top']}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons name="lock-open-outline" size={28} color="#8B6EFF" />
          </View>
          <Text style={styles.heroTitle}>Forgot password?</Text>
          <Text style={styles.heroSub}>
            {sent
              ? 'Check your inbox'
              : "No worries — we'll send you a reset link"}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.formSheet}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!sent ? (
            <>
              {/* Error banner */}
              {!!error && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.inputGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={focused ? '#6C47FF' : '#9299B8'}
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    style={styles.fieldInput}
                    value={email}
                    onChangeText={t => { setEmail(t); setError(''); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="you@example.com"
                    placeholderTextColor="#636B8A"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(400)}>
                <Button
                  title={loading ? 'Sending…' : 'Send Reset Link'}
                  onPress={handleSubmit}
                  disabled={!isValid || loading}
                  loading={loading}
                  size="lg"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.footer}>
                <Text style={styles.footerText}>Remembered it? </Text>
                <Pressable onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Log In</Text>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(400)} style={styles.successContainer}>
              {/* Big envelope illustration */}
              <View style={styles.successIconWrap}>
                <LinearGradient colors={['#8B6EFF', '#6C47FF']} style={styles.successIconGrad}>
                  <Ionicons name="mail" size={36} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Email sent!</Text>
              <Text style={styles.successBody}>
                We sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email.trim().toLowerCase()}</Text>
              </Text>

              <View style={styles.successSteps}>
                <StepRow n="1" text="Open the email from Examify" />
                <StepRow n="2" text='Tap "Reset my password"' />
                <StepRow n="3" text="Choose a new password in your browser" />
                <StepRow n="4" text="Come back and log in" />
              </View>

              <Pressable
                onPress={() => Linking.openURL('mailto:')}
                style={styles.openMailBtn}
              >
                <Ionicons name="mail-open-outline" size={18} color="#6C47FF" />
                <Text style={styles.openMailText}>Open email app</Text>
              </Pressable>

              <Text style={styles.resendNote}>
                Didn't get it?{' '}
                <Text
                  style={styles.resendLink}
                  onPress={() => { setSent(false); setError(''); }}
                >
                  Try again
                </Text>
              </Text>

              <Pressable onPress={() => navigation.navigate('Login')} style={styles.backToLogin}>
                <Ionicons name="arrow-back" size={16} color="#9299B8" />
                <Text style={styles.backToLoginText}>Back to Log In</Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const StepRow = ({ n, text }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{n}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  flex:   { flex: 1 },

  topGrad:    { paddingHorizontal: 24, paddingBottom: 36 },
  backBtn:    { marginTop: 4, marginBottom: 20, alignSelf: 'flex-start', padding: 4 },
  headerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(139,110,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle:  { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSub:    { fontSize: 14, color: 'rgba(255,255,255,0.55)' },

  formSheet:   { flex: 1, backgroundColor: '#F5F6FA' },
  formContent: { padding: 24, paddingTop: 28, gap: 20, flexGrow: 1 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12 },
  errorText:   { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1 },

  inputGroup: { gap: 8 },
  label:      { fontSize: 13, fontWeight: '600', color: '#1A1B2F' },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E4F0',
    paddingHorizontal: 14, paddingVertical: 14, gap: 10,
  },
  fieldFocused: { borderColor: '#6C47FF', backgroundColor: '#FAFBFF' },
  fieldError:   { borderColor: '#EF4444' },
  fieldIcon:    {},
  fieldInput:   { flex: 1, fontSize: 15, color: '#1A1B2F', padding: 0 },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#6C47FF' },

  // Success state
  successContainer: { alignItems: 'center', paddingTop: 8, gap: 16 },

  successIconWrap: { marginBottom: 4 },
  successIconGrad: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },

  successTitle: { fontSize: 24, fontWeight: '800', color: '#1A1B2F' },
  successBody:  { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  successEmail: { fontWeight: '700', color: '#1A1B2F' },

  successSteps: {
    width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  stepRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum:     { width: 26, height: 26, borderRadius: 8, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#6C47FF' },
  stepText:    { fontSize: 14, color: '#374151', flex: 1 },

  openMailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#6C47FF', backgroundColor: '#F5F3FF',
    width: '100%', justifyContent: 'center',
  },
  openMailText: { fontSize: 15, fontWeight: '700', color: '#6C47FF' },

  resendNote: { fontSize: 13, color: '#9299B8' },
  resendLink: { fontWeight: '700', color: '#6C47FF' },

  backToLogin:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  backToLoginText: { fontSize: 14, color: '#9299B8', fontWeight: '500' },
});
