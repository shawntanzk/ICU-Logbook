// Shown to users who signed up via Google OAuth (or any path that bypassed
// the self-registration form) and therefore have no country or medical
// registration number on file yet.
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
import { SelectField } from '../components/SelectField';
import { COUNTRY_OPTIONS } from '../data/countries';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

export function CompleteRegistrationScreen() {
  const { completeRegistration } = useAuthStore();

  const [country, setCountry] = useState<string | null>(null);
  const [medRegNumber, setMedRegNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!country) { setError('Please select your country.'); return; }
    if (!medRegNumber.trim() || medRegNumber.trim().length < 2) {
      setError('Please enter your medical registration number.');
      return;
    }

    setBusy(true);
    try {
      const result = await completeRegistration({
        country: country!,
        medRegNumber: medRegNumber.trim(),
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not save. Please try again.');
      }
      // On success the authStore sets profileComplete → true, which causes
      // RootNavigator to unmount this screen and show MainTabs automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={52} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Complete Your Registration</Text>
          <Text style={styles.subtitle}>
            Before you start logging, we need your country and medical registration number.
            Your registration number will be hashed immediately — we cannot read it.
          </Text>

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
            Enter the number exactly as it appears on your registration certificate.
            Spaces and capitalisation are normalised automatically.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, busy && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.btnText}>Save and Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipRow}
            onPress={() => Alert.alert(
              'Registration required',
              'A valid medical registration number is required to use ICU Logbook. Please enter yours to continue.',
            )}
          >
            <Text style={styles.skipText}>Why is this required?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  iconWrap: { alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
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
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    lineHeight: 17,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.md },
  btn: {
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
  btnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.white },
  skipRow: { alignItems: 'center', marginTop: SPACING.lg },
  skipText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },
});
