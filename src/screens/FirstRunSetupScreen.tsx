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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

// Shown on the very first launch (or after a data wipe) when the server
// DB has zero users. The form creates the initial admin and signs them
// in — no other role can be created here.
export function FirstRunSetupScreen() {
  const { createFirstAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email.trim()) return setError('Please enter an email.');
    if (!displayName.trim()) return setError('Please enter a display name.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const result = await createFirstAdmin({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
      });
      if (!result.ok) setError(result.error || 'Could not create admin account.');
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
              <Ionicons name="shield-checkmark" size={40} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>Welcome</Text>
            <Text style={styles.tagline}>Create the initial administrator account</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin Setup</Text>
            <Text style={styles.hint}>
              No accounts exist yet. The first account is always an administrator — you'll be
              able to create additional users from the Admin Panel once you're signed in.
            </Text>

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
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Display name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
              value={displayName}
              onChangeText={(v) => { setDisplayName(v); setError(''); }}
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            <Text style={[styles.label, { marginTop: SPACING.md }]}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textMuted}
              value={confirm}
              onChangeText={(v) => { setConfirm(v); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
              editable={!busy}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, busy && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create Admin &amp; Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
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
  tagline: { fontSize: FONT_SIZE.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg },
  cardTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 18 },
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
  submitBtn: {
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
  submitBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.white },
});
