import React, { useState } from 'react';
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
import { loginUser, clearError, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';
import { Button } from '../../components/ui';

const Field = ({ label, icon, error, inputRef, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View style={[
        styles.field,
        focused && styles.fieldFocused,
        error && styles.fieldError,
      ]}>
        <Ionicons name={icon} size={18} color={focused ? '#6C47FF' : '#9299B8'} style={styles.fieldIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            ref={inputRef}
            style={styles.fieldInput}
            placeholderTextColor="#636B8A"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
        </View>
      </View>
      {error && <Text style={styles.fieldErr}>{error}</Text>}
    </View>
  );
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password) return;
    dispatch(clearError());
    dispatch(loginUser({ email: email.trim().toLowerCase(), password }));
  };

  const isValid = email.trim().length > 0 && password.length >= 6;

  return (
    <View style={styles.screen}>
      {/* Top gradient header */}
      <LinearGradient colors={['#1A0A3E', '#0D0828']} style={styles.topGrad}>
        <SafeAreaView edges={['top']}>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 22 }}>🎓</Text>
            </View>
            <Text style={styles.logoText}>Examify</Text>
          </View>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSub}>Continue your exam preparation</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form card */}
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
              label="Email address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
            />
            <View>
              <View style={[styles.field, password.length > 0 && styles.fieldFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={password ? '#6C47FF' : '#9299B8'} style={styles.fieldIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="••••••••"
                    placeholderTextColor="#636B8A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9299B8" />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <Pressable
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Button
              title={isLoading ? 'Logging in…' : 'Log In'}
              onPress={handleLogin}
              disabled={!isValid || isLoading}
              loading={isLoading}
              size="lg"
            />
          </Animated.View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign Up Free</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },

  // Header
  topGrad: { paddingHorizontal: 24, paddingBottom: 40 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, marginBottom: 24 },
  logoCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(139,110,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },

  // Form sheet
  formSheet: { flex: 1, backgroundColor: '#F5F6FA', borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -20 },
  formContent: { padding: 24, paddingTop: 28, gap: 16, flexGrow: 1 },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1 },

  // Fields
  fields: { gap: 12 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E4F0',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  fieldFocused: { borderColor: '#6C47FF', backgroundColor: '#FAFBFF' },
  fieldError: { borderColor: '#EF4444' },
  fieldIcon: { marginTop: 2 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9299B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, color: '#1A1B2F', padding: 0 },
  fieldErr: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: '600', color: '#6C47FF' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E4F0' },
  dividerText: { fontSize: 13, color: '#9299B8', fontWeight: '500' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#6C47FF' },
});
