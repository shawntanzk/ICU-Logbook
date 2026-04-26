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
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useGuestStore } from '../store/guestStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import type { RootStackParamList } from '../navigation/types';

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { signIn, signInWithGoogle, sendPasswordReset } = useAuthStore();
  const { enterGuestMode } = useGuestStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setBusy(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) setError(result.error ?? 'Sign in failed.');
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
          'Check your inbox for a link to reset your password.',
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

  async function handleContinueOffline() {
    setBusy(true);
    try {
      await enterGuestMode();
      // RootNavigator reacts to isGuest=true and renders MainTabs.
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
            <Text style={styles.cardTitle}>Sign In</Text>

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
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              editable={!busy}
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              disabled={busy}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, busy && { opacity: 0.7 }]}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
              <Text style={styles.registerBtnText}>Create an Account</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.offlineBtn, busy && { opacity: 0.7 }]}
              onPress={handleContinueOffline}
              activeOpacity={0.85}
              disabled={busy}
            >
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.offlineBtnText}>Continue without account</Text>
            </TouchableOpacity>
            <Text style={styles.offlineHint}>
              Data stays on this device only. Sign in later to sync to the cloud.
            </Text>
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
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
  },
  registerBtnText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.primary },
  offlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  offlineBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '500', color: COLORS.textMuted },
  offlineHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
});
