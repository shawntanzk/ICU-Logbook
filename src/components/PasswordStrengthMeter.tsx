import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../utils/constants';

// Lightweight password strength meter. Not a replacement for zxcvbn
// but catches the obvious mistakes (too short, no variety, single
// character class) and gives users a visible progress bar so they
// actually type something reasonable.

export interface PasswordScore {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hints: string[];
}

export function scorePassword(pw: string): PasswordScore {
  const hints: string[] = [];
  if (pw.length < 8) hints.push('At least 8 characters');
  if (!/[a-z]/.test(pw)) hints.push('A lowercase letter');
  if (!/[A-Z]/.test(pw)) hints.push('An uppercase letter');
  if (!/\d/.test(pw)) hints.push('A number');
  if (!/[^a-zA-Z0-9]/.test(pw)) hints.push('A symbol');
  // length beyond 12 counts double for score
  let raw = 0;
  if (pw.length >= 8) raw++;
  if (pw.length >= 12) raw++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) raw++;
  if (/\d/.test(pw)) raw++;
  if (/[^a-zA-Z0-9]/.test(pw)) raw++;
  const score = Math.min(4, raw) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  return { score, label: labels[score], hints };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, hints } = scorePassword(password);
  const colour = [COLORS.error, COLORS.error, COLORS.warning, COLORS.success, COLORS.success][score];
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Password strength: ${label}`}>
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < score ? colour : COLORS.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: colour }]}>{label}</Text>
      {hints.length > 0 && score < 3 && (
        <Text style={styles.hint}>Add: {hints.join(', ').toLowerCase()}.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: SPACING.xs },
  barRow: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: FONT_SIZE.xs, fontWeight: '600', marginTop: 4 },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
});
