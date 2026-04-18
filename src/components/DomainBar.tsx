import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

interface Props {
  label: string;
  count: number;
  maxCount: number;
}

export function DomainBar({ label, count, maxCount }: Props) {
  const pct = maxCount > 0 ? Math.min((count / maxCount) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.sm + 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  label: { fontSize: FONT_SIZE.sm, color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  count: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  track: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
});
