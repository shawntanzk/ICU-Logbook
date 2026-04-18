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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, UserRole } from '../store/authStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

export function LoginScreen() {
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('trainee');
  const [error, setError] = useState('');

  function handleLogin() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    login(name.trim(), role);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo / branding */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Ionicons name="pulse" size={44} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>ICU Logbook</Text>
            <Text style={styles.tagline}>Clinical Competency Tracker</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {/* Name */}
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Dr. Jane Smith"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={(v) => { setName(v); setError(''); }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Role selector */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>I am a…</Text>
            <View style={styles.roleRow}>
              <RoleButton
                label="Trainee"
                icon="school-outline"
                active={role === 'trainee'}
                onPress={() => setRole('trainee')}
              />
              <View style={{ width: SPACING.sm }} />
              <RoleButton
                label="Supervisor"
                icon="ribbon-outline"
                active={role === 'supervisor'}
                onPress={() => setRole('supervisor')}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Demo mode — no password required.{'\n'}Data stored locally on this device.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.roleBtn, active && styles.roleBtnActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={24} color={active ? COLORS.white : COLORS.textMuted} />
      <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },
  roleRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  roleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted },
  roleBtnTextActive: { color: COLORS.white },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
  },
  loginBtnText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.white },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
