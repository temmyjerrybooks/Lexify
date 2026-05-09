import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser, clearError, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';
import { Button } from '../../components/ui';

const Field = ({ label, icon, secure, value, onChangeText, error, ...props }) => {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View>
      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        <Ionicons name={icon} size={18} color={focused ? '#6C47FF' : '#9299B8'} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.fieldInput}
            placeholderTextColor="#636B8A"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            secureTextEntry={secure && !show}
            value={value}
            onChangeText={onChangeText}
            {...props}
          />
        </View>
        {secure && (
          <Pressable onPress={() => setShow(v => !v)} hitSlop={10}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9299B8" />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
    </View>
  );
};

const SignupScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const registrationSuccess = useSelector(s => s.auth.registrationSuccess);

  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' });
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (registrationSuccess) navigation.navigate('Login');
  }, [registrationSuccess]);

  const fieldErrors = {
    username: form.username.length > 0 && form.username.length < 3 ? 'At least 3 characters' : null,
    password: form.password.length > 0 && form.password.length < 8 ? 'At least 8 characters' : null,
  };

  const isValid = form.email.trim() && form.username.length >= 3 && form.password.length >= 8;

  const handleSignup = () => {
    if (!isValid || isLoading) return;
    dispatch(clearError());
    dispatch(registerUser({ ...form, email: form.email.trim().toLowerCase() }));
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#1A0A3E', '#0D0828']} style={styles.topGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 22 }}>🎓</Text>
            </View>
            <Text style={styles.logoText}>Examify</Text>
          </View>
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSub}>Join thousands acing IELTS, TEF, TCF & DALF</Text>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.formSheet}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.fields}>
            <Field
              label="Full Name (optional)"
              icon="person-outline"
              value={form.full_name}
              onChangeText={v => set('full_name', v)}
              placeholder="Temi Adebayo"
              autoCorrect={false}
            />
            <Field
              label="Username"
              icon="at-outline"
              value={form.username}
              onChangeText={v => set('username', v.toLowerCase().replace(/\s/g, ''))}
              placeholder="temi_ielts"
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.username}
            />
            <Field
              label="Email address"
              icon="mail-outline"
              value={form.email}
              onChangeText={v => set('email', v)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              label="Password (min 8 characters)"
              icon="lock-closed-outline"
              value={form.password}
              onChangeText={v => set('password', v)}
              placeholder="••••••••"
              secure
              error={fieldErrors.password}
            />
          </Animated.View>

          <Text style={styles.terms}>
            By signing up you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Button
              title={isLoading ? 'Creating account…' : 'Create Free Account'}
              onPress={handleSignup}
              disabled={!isValid || isLoading}
              loading={isLoading}
              size="lg"
            />
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  topGrad: { paddingHorizontal: 24, paddingBottom: 40 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, marginBottom: 24 },
  logoCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(139,110,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  formSheet: { flex: 1, backgroundColor: '#F5F6FA', marginTop: -20 },
  formContent: { padding: 24, paddingTop: 28, gap: 16, flexGrow: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1 },
  fields: { gap: 12 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E4F0', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  fieldFocused: { borderColor: '#6C47FF', backgroundColor: '#FAFBFF' },
  fieldError: { borderColor: '#EF4444' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9299B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, color: '#1A1B2F', padding: 0 },
  fieldErr: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  terms: { fontSize: 12, color: '#9299B8', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#6C47FF', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 8 },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#6C47FF' },
});
