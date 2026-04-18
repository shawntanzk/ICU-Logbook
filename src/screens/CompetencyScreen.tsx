import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaseStore } from '../store/caseStore';
import { Card } from '../components/Card';
import { COBATRICE_DOMAINS, COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'Competency'>;

// Heat levels: 0 → grey, 1-2 → light, 3-5 → medium, 6+ → full
function heatColor(count: number): string {
  if (count === 0) return '#E9ECF0';
  if (count <= 2) return '#A8C8F0';
  if (count <= 5) return '#4A90D9';
  return COLORS.primary;
}

function heatLabel(count: number): string {
  if (count === 0) return 'Not started';
  if (count <= 2) return 'Developing';
  if (count <= 5) return 'Progressing';
  return 'Proficient';
}

export function CompetencyScreen({ navigation }: Props) {
  const { cases, domainCounts, fetchCases } = useCaseStore();

  useEffect(() => {
    fetchCases();
  }, []);

  const totalDomainsTouched = Object.values(domainCounts).filter((c) => c > 0).length;
  const totalCases = cases.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary row */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalDomainsTouched}</Text>
            <Text style={styles.summaryLabel}>Domains touched</Text>
          </Card>
          <View style={{ width: SPACING.sm }} />
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{COBATRICE_DOMAINS.length - totalDomainsTouched}</Text>
            <Text style={styles.summaryLabel}>Not yet covered</Text>
          </Card>
          <View style={{ width: SPACING.sm }} />
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalCases}</Text>
            <Text style={styles.summaryLabel}>Total cases</Text>
          </Card>
        </View>

        {/* Heatmap grid — 3 columns */}
        <Text style={styles.sectionTitle}>CoBaTrICE Domain Heatmap</Text>
        <View style={styles.grid}>
          {COBATRICE_DOMAINS.map((domain) => {
            const count = domainCounts[domain.id] ?? 0;
            const bg = heatColor(count);
            const isLight = count === 0;
            return (
              <View key={domain.id} style={[styles.cell, { backgroundColor: bg }]}>
                <Text style={[styles.cellCount, isLight && styles.cellCountLight]}>{count}</Text>
                <Text
                  style={[styles.cellLabel, isLight && styles.cellLabelLight]}
                  numberOfLines={2}
                >
                  {domain.label}
                </Text>
                <Text style={[styles.cellStatus, isLight && styles.cellLabelLight]}>
                  {heatLabel(count)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <Card style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendRow}>
            {[
              { color: '#E9ECF0', label: 'Not started' },
              { color: '#A8C8F0', label: 'Developing (1–2)' },
              { color: '#4A90D9', label: 'Progressing (3–5)' },
              { color: COLORS.primary, label: 'Proficient (6+)' },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {totalCases === 0 && (
          <Text style={styles.emptyNote}>
            Log cases to start building your competency map.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  summaryRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  summaryValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  summaryLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  cell: {
    width: '30.5%',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  cellCount: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white },
  cellCountLight: { color: COLORS.textMuted },
  cellLabel: { fontSize: 10, color: COLORS.white, fontWeight: '600', lineHeight: 13 },
  cellLabelLight: { color: COLORS.textMuted },
  cellStatus: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  legend: { marginBottom: SPACING.md },
  legendTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  legendRow: { gap: SPACING.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendSwatch: { width: 16, height: 16, borderRadius: RADIUS.sm },
  legendLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  emptyNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
