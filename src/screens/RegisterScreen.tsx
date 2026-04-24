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
import { PasswordStrengthMeter, scorePassword } from '../components/PasswordStrengthMeter';
import { SelectField } from '../components/SelectField';
import { COUNTRY_OPTIONS } from '../data/countries';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { supabase } from '../services/supabase';
import type { RootStackParamList } from '../navigation/types';

export function RegisterScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [medRegNumber, setMedRegNumber] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pwScore = scorePassword(password);

  function validate(): string | null {
    if (!displayName.trim()) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (pwScore < 2) return 'Please choose a stronger password.';
    if (!country) return 'Please select your country.';
    if (!medRegNumber.trim() || medRegNumber.trim().length < 2) {
      return 'Please enter your medical registration number.';
    }
    if (!agreed) return 'You must agree to the Terms of Service and Privacy Policy.';
    return null;
  }

  async function handleRegister() {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('register', {
        body: {
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          country: country!,
          med_reg_number: medRegNumber.trim(),
        },
      });

      if (fnError) {
        setError(fnError.message ?? 'Registration failed. Please try again.');
        return;
      }

      const result = data as { ok: boolean; needsEmailConfirmation?: boolean; error?: string };

      if (!result.ok) {
        setError(result.error ?? 'Registration failed. Please try again.');
        return;
      }

      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check your inbox',
          `We've sent a confirmation link to ${email.trim().toLowerCase()}. Click it to activate your account, then sign in here.`,
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
        );
        return;
      }

      // Email confirmation disabled — account is ready. Tell the user to sign in.
      Alert.alert(
        'Account created',
        'Your account is ready. Sign in to get started.',
        [{ text: 'Sign In', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
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

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.brand}>
              <View style={styles.logoWrap}>
                <Ionicons name="pulse" size={36} color={COLORS.white} />
              </View>
              <Text style={styles.appName}>ICU Logbook</Text>
              <Text style={styles.tagline}>Create Your Account</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register</Text>
            <Text style={styles.cardSubtitle}>
              Your medical registration number is one-way encrypted — we can never read it.
            </Text>

            {/* ── Personal details ──────────────────────────────────── */}
            <Text style={styles.sectionHeading}>Personal Details</Text>

            <Text style={styles.label}>Full name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Dr. Jane Doe"
              placeholderTextColor={COLORS.textMuted}
              value={displayName}
              onChangeText={(v) => { setDisplayName(v); setError(''); }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Email <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Password <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <PasswordStrengthMeter password={password} />

            <Text style={[styles.label, { marginTop: SPACING.sm }]}>Confirm password <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
              ]}
              placeholder="Repeat your password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.fieldError}>Passwords do not match</Text>
            )}

            {/* ── Professional details ───────────────────────────────── */}
            <Text style={[styles.sectionHeading, { marginTop: SPACING.lg }]}>Professional Details</Text>

            <SelectField
              label="Country of practice"
              required
              options={COUNTRY_OPTIONS}
              value={country}
              onChange={(v) => { setCountry(v); setError(''); }}
              placeholder="Select your country…"
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>
              Medical registration number <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1234567 or GMC1234567"
              placeholderTextColor={COLORS.textMuted}
              value={medRegNumber}
              onChangeText={(v) => { setMedRegNumber(v); setError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
            />
            <Text style={styles.hint}>
              Your registration number is immediately hashed on our servers using HMAC-SHA256. The original
              number is never stored — not even administrators can read it. It can only be validated (not
              retrieved) by authorised parties.
            </Text>

            {/* ── Agreement ─────────────────────────────────────────── */}
            <TouchableOpacity
              style={styles.agreeRow}
              onPress={() => { setAgreed((v) => !v); setError(''); }}
              activeOpacity={0.7}
              disabled={busy}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.agreeText}>
                I agree to the{' '}
                <Text style={styles.link}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* ── Error + submit ────────────────────────────────────── */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={busy}
              style={styles.signInRow}
            >
              <Text style={styles.signInText}>
                Already have an account?{' '}
                <Text style={styles.signInLink}>Sign in</Text>
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
  content: { flexGrow: 1, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { marginBottom: SPACING.lg },
  backBtn: { marginBottom: SPACING.md },
  brand: { alignItems: 'center' },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  appName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white },
  tagline: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  cardTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  cardSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 18 },
  sectionHeading: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  req: { color: COLORS.error },
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
  inputError: { borderColor: COLORS.error },
  fieldError: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: 4 },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    lineHeight: 17,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  agreeText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  link: { color: COLORS.primary, fontWeight: '600' },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.md },
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
  signInRow: { alignItems: 'center', marginTop: SPACING.lg },
  signInText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  signInLink: { color: COLORS.primary, fontWeight: '700' },
});
