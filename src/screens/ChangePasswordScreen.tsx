import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { PasswordStrengthMeter, scorePassword } from '../components/PasswordStrengthMeter';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import type { SettingsStackParamList } from '../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const { updatePassword } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError('');
    if (scorePassword(password).score < 2) {
      setError('Please choose a stronger password (at least 8 chars, mixed case or digits).');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.error ?? 'Could not update password.');
        return;
      }
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <PasswordStrengthMeter password={password} />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, busy && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={COLORS.white} />
                <Text style={styles.btnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.md },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
    minHeight: 52,
  },
  btnText: { fontSize: FONT_SIZE.md, color: COLORS.white, fontWeight: '700' },
});
