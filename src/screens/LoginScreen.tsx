import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { PasswordStrengthMeter, scorePassword } from '../components/PasswordStrengthMeter';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

type Mode = 'signIn' | 'signUp';

export function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuthStore();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  function toggleMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError('');
  }

  async function handleSubmit() {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    if (isSignUp && !displayName.trim()) { setError('Please enter your name.'); return; }
    if (isSignUp && password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setBusy(true);
    try {
      const result = isSignUp
        ? await signUp({ email, displayName, password })
        : await signIn(email, password);
      if (result.ok) return;
      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check your inbox',
          'We sent a confirmation link to your email. Click it, then return here to sign in.'
        );
        setMode('signIn');
        return;
      }
      setError(result.error || (isSignUp ? 'Sign up failed.' : 'Sign in failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email above first, then tap Forgot password again.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = await sendPasswordReset(email);
      if (result.ok) {
        Alert.alert(
          'Reset link sent',
          'Check your inbox for a link to reset your password. Open it on this device to come back in.'
        );
      } else {
        setError(result.error ?? 'Could not send reset email.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (!result.ok) setError(result.error || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Ionicons name="pulse" size={44} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>ICU Logbook</Text>
            <Text style={styles.tagline}>Clinical Competency Tracker</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

            {isSignUp && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Dr. Jane Doe"
                  placeholderTextColor={COLORS.textMuted}
                  value={displayName}
                  onChangeText={(v) => { setDisplayName(v); setError(''); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!busy}
                />
                <View style={{ height: SPACING.md }} />
              </>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!busy}
            />

            {isSignUp && <PasswordStrengthMeter password={password} />}

            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={handleForgotPassword}
                disabled={busy}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, busy && { opacity: 0.7 }]}
              onPress={handleGoogle}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Ionicons name="logo-google" size={18} color={COLORS.text} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMode} disabled={busy} style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : 'New here? '}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Sign in' : 'Create an account'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  content: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  brand: { alignItems: 'center', marginBottom: SPACING.xl },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  appName: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.white },
  tagline: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  cardTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    minHeight: 48,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.sm },
  forgotBtn: { alignSelf: 'flex-end', marginTop: SPACING.sm },
  forgotText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
    marginTop: SPACING.lg,
  },
  primaryBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.white },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
  },
  googleBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  toggleRow: { alignItems: 'center', marginTop: SPACING.lg },
  toggleText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  toggleLink: { color: COLORS.primary, fontWeight: '700' },
});
