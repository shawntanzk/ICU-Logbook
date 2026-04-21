import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTermsStore, TERMS_VERSION } from '../store/termsStore';
import { useAuthStore } from '../store/authStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

// Hard gate shown after login but before Main. Accepting writes a
// versioned timestamp to app_settings so we have an auditable record
// of the exact text the user agreed to.
export function TermsScreen() {
  const accept = useTermsStore((s) => s.accept);
  const logout = useAuthStore((s) => s.logout);
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    try {
      await accept();
    } catch (e) {
      Alert.alert('Could not save acceptance', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleDecline() {
    Alert.alert(
      'Decline and sign out?',
      'You must accept the Terms and Privacy notice to use ICU Logbook.',
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="document-text" size={28} color={COLORS.primary} />
          <Text style={styles.title}>Terms & Privacy</Text>
          <Text style={styles.version}>Version {TERMS_VERSION}</Text>
        </View>

        <Text style={styles.h2}>What this app is</Text>
        <Text style={styles.p}>
          ICU Logbook is a personal clinical training logbook. It is designed to help you record
          cases and procedures you have been involved in, for your own learning, reflection and
          portfolio. It is not a medical device, not a decision-support tool, and not a substitute
          for professional clinical judgement or official medical records.
        </Text>

        <Text style={styles.h2}>What data we store</Text>
        <Text style={styles.p}>
          Records you create are stored locally on this device (SQLite) and, unless you enable
          offline-only mode, replicated to a Supabase project under your account. Records may
          include free-text reflections, supervision level, procedure types, dates and outcomes.
          {'\n\n'}
          You are responsible for ensuring you have authority to record this information and that
          you follow your institution's rules on patient-identifiable data. Do not enter names,
          hospital numbers, or other direct identifiers in free-text fields.
        </Text>

        <Text style={styles.h2}>Your account</Text>
        <Text style={styles.p}>
          Authentication is handled by Supabase. You can sign in with email and password and/or a
          linked Google identity. You may change your password, link or unlink Google, and request
          deletion of your account at any time from Settings.
        </Text>

        <Text style={styles.h2}>Sharing and export</Text>
        <Text style={styles.p}>
          Data is never shared with third parties by default. Exports (FHIR / openEHR / JSON-LD)
          are generated on-device and written only where you choose. Changing your data-sharing
          consent in Settings will not retroactively share past records without your action.
        </Text>

        <Text style={styles.h2}>Your rights</Text>
        <Text style={styles.p}>
          You can view, edit and delete every record you own. Deleted records are tombstoned
          locally and propagated to the server on next sync. On request, we will permanently purge
          your account and its associated rows from the backend.
        </Text>

        <Text style={styles.h2}>No warranty</Text>
        <Text style={styles.p}>
          The app is provided "as is" without warranty of any kind. You use it at your own risk.
          The authors are not liable for any loss arising from use of, or reliance on, the
          information it contains.
        </Text>

        <Text style={styles.ack}>
          By tapping "I agree" you confirm that you have read and accept the above, and that you
          will not enter patient-identifiable data into this app.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleAccept}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>I agree — continue</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleDecline} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>Decline and sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { alignItems: 'center', marginBottom: SPACING.lg, gap: SPACING.xs },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  version: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  h2: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  p: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  ack: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontStyle: 'italic',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  secondaryBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  secondaryBtnText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '500' },
});
