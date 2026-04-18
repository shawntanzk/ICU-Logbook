import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/StatCard';
import { Card } from '../components/Card';
import { DomainBar } from '../components/DomainBar';
import { COBATRICE_DOMAINS, COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import type { DashboardStackProps } from '../navigation/types';

export function DashboardScreen({ navigation }: DashboardStackProps<'DashboardHome'>) {
  const { cases, casesThisMonth, domainCounts, fetchCases } = useCaseStore();
  const { procedures, successRate, fetchProcedures } = useProcedureStore();
  const { userName, role } = useAuthStore();

  useEffect(() => {
    fetchCases();
    fetchProcedures();
  }, []);

  const maxDomainCount = Math.max(...Object.values(domainCounts), 1);
  const recentCases = cases.slice(0, 5);
  const domainsTouched = Object.values(domainCounts).filter((c) => c > 0).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Welcome, {userName || 'Doctor'}</Text>
            <Text style={styles.headerSub}>
              {role === 'supervisor' ? 'Supervisor View · Read Only' : 'Your clinical progress'}
            </Text>
          </View>
          {role === 'supervisor' && (
            <View style={styles.supervisorBadge}>
              <Ionicons name="ribbon" size={14} color={COLORS.accent} />
              <Text style={styles.supervisorBadgeText}>Supervisor</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total Cases" value={cases.length} icon="document-text" />
          <View style={styles.statGap} />
          <StatCard label="This Month" value={casesThisMonth} icon="calendar" color={COLORS.accent} />
          <View style={styles.statGap} />
          <StatCard label="Procedures" value={procedures.length} icon="medkit" color={COLORS.warning} />
        </View>

        {procedures.length > 0 && (
          <View style={[styles.statsRow, { marginTop: -SPACING.sm }]}>
            <StatCard label="Success Rate" value={`${successRate}%`} icon="checkmark-circle" color={COLORS.success} />
            <View style={styles.statGap} />
            <StatCard label="Domains Covered" value={`${domainsTouched}/12`} icon="trophy" color={COLORS.primaryLight} />
          </View>
        )}

        {/* Competency map shortcut */}
        <TouchableOpacity
          style={styles.competencyBanner}
          onPress={() => navigation.navigate('Competency')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.competencyBannerTitle}>Competency Map</Text>
            <Text style={styles.competencyBannerSub}>
              {domainsTouched} of 12 CoBaTrICE domains covered
            </Text>
          </View>
          <View style={styles.competencyBannerRight}>
            <View style={styles.competencyProgress}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.competencyDot,
                    i < domainsTouched ? styles.competencyDotFilled : styles.competencyDotEmpty,
                  ]}
                />
              ))}
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.white} style={{ marginTop: SPACING.xs }} />
          </View>
        </TouchableOpacity>

        {/* CoBaTrICE Domain Coverage */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Domain Coverage</Text>
          {COBATRICE_DOMAINS.map((domain) => (
            <DomainBar
              key={domain.id}
              label={domain.label}
              count={domainCounts[domain.id] ?? 0}
              maxCount={maxDomainCount}
            />
          ))}
          {cases.length === 0 && (
            <Text style={styles.emptyNote}>Log your first case to start tracking domains.</Text>
          )}
        </Card>

        {/* Recent Cases */}
        {recentCases.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Cases</Text>
            {recentCases.map((c, i) => (
              <View key={c.id} style={[styles.recentItem, i < recentCases.length - 1 && styles.recentItemBorder]}>
                <Text style={styles.recentDate}>{formatDisplay(c.date)}</Text>
                <Text style={styles.recentDiagnosis} numberOfLines={1}>{c.diagnosis}</Text>
                <Text style={styles.recentDomains}>
                  {c.cobatriceDomains.length} domain{c.cobatriceDomains.length !== 1 ? 's' : ''}
                  {!c.synced && <Text style={styles.unsyncedTag}> · Pending sync</Text>}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.lg },
  headerGreeting: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  supervisorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent + '18',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  supervisorBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.accent, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginBottom: SPACING.md },
  statGap: { width: SPACING.sm },
  competencyBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  competencyBannerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.white },
  competencyBannerSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  competencyBannerRight: { alignItems: 'flex-end' },
  competencyProgress: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', maxWidth: 90, justifyContent: 'flex-end' },
  competencyDot: { width: 8, height: 8, borderRadius: 4 },
  competencyDotFilled: { backgroundColor: COLORS.white },
  competencyDotEmpty: { backgroundColor: 'rgba(255,255,255,0.25)' },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  emptyNote: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.sm },
  recentItem: { paddingVertical: SPACING.sm },
  recentItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recentDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  recentDiagnosis: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500', marginVertical: 2 },
  recentDomains: { fontSize: FONT_SIZE.xs, color: COLORS.accent },
  unsyncedTag: { color: COLORS.warning },
});
