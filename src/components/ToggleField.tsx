import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';

interface Props {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export function ToggleField({ label, value, onChange, hint, disabled }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
          thumbColor={value ? COLORS.primary : COLORS.white}
          ios_backgroundColor={COLORS.border}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: { flex: 1, marginRight: SPACING.md },
  label: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500' },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
});
