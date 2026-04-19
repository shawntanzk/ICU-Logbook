import React, { useEffect, useMemo, useState } from 'react';
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

type CaseFilter = 'all' | 'logged' | 'supervised' | 'observed' | 'unsupervised';

const FILTER_OPTIONS: { id: CaseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'logged', label: 'Logged' },
  { id: 'supervised', label: 'Supervised' },
  { id: 'observed', label: 'Observed' },
  { id: 'unsupervised', label: 'Unsupervised' },
];

export function DashboardScreen({ navigation }: DashboardStackProps<'DashboardHome'>) {
  const { cases, casesThisMonth, domainCounts, fetchCases } = useCaseStore();
  const { procedures, successRate, fetchProcedures } = useProcedureStore();
  const { userId, userName, role } = useAuthStore();
  const [filter, setFilter] = useState<CaseFilter>('all');

  useEffect(() => {
    fetchCases();
    fetchProcedures();
  }, []);

  const ownedCount = useMemo(
    () => cases.filter((c) => c.ownerId === userId).length,
    [cases, userId]
  );
  const supervisedCount = useMemo(
    () => cases.filter((c) => c.supervisorUserId === userId).length,
    [cases, userId]
  );
  const pendingApprovalCount = useMemo(
    () =>
      cases.filter(
        (c) => c.supervisorUserId === userId && !c.approvedBy
      ).length,
    [cases, userId]
  );

  const filteredCases = useMemo(() => {
    switch (filter) {
      case 'logged':
        return cases.filter((c) => c.ownerId === userId);
      case 'supervised':
        return cases.filter((c) => c.supervisorUserId === userId);
      case 'observed':
        return cases.filter((c) => c.observerUserId === userId);
      case 'unsupervised':
        return cases.filter(
          (c) =>
            c.ownerId === userId &&
            !c.supervisorUserId &&
            !c.externalSupervisorName
        );
      default:
        return cases;
    }
  }, [cases, filter, userId]);

  const maxDomainCount = Math.max(...Object.values(domainCounts), 1);
  const recentCases = filteredCases.slice(0, 5);
  const domainsTouched = Object.values(domainCounts).filter((c) => c > 0).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Welcome, {userName || 'Doctor'}</Text>
            <Text style={styles.headerSub}>
              {role === 'admin' ? 'Administrator · all records' : 'Your clinical progress'}
            </Text>
          </View>
          {role === 'admin' && (
            <View style={styles.supervisorBadge}>
              <Ionicons name="shield" size={14} color={COLORS.accent} />
              <Text style={styles.supervisorBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        {/* Stats — split logged vs supervised so the two roles are legible */}
        <View style={styles.statsRow}>
          <StatCard label="Logged" value={ownedCount} icon="document-text" />
          <View style={styles.statGap} />
          <StatCard label="Supervised" value={supervisedCount} icon="shield-checkmark" color={COLORS.accent} />
          <View style={styles.statGap} />
          <StatCard label="Procedures" value={procedures.length} icon="medkit" color={COLORS.warning} />
        </View>
        <View style={[styles.statsRow, { marginTop: -SPACING.sm }]}>
          <StatCard label="This Month" value={casesThisMonth} icon="calendar" color={COLORS.primaryLight} />
          {pendingApprovalCount > 0 && (
            <>
              <View style={styles.statGap} />
              <StatCard
                label="Awaiting your approval"
                value={pendingApprovalCount}
                icon="hourglass"
                color={COLORS.warning}
              />
            </>
          )}
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

        {/* Filter pills */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Cases</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {FILTER_OPTIONS.map((opt) => {
              const active = filter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {recentCases.length === 0 ? (
            <Text style={styles.emptyNote}>No cases match this filter.</Text>
          ) : (
            recentCases.map((c, i) => {
              const relation =
                c.ownerId === userId
                  ? c.supervisorUserId || c.externalSupervisorName
                    ? 'Logged'
                    : 'Logged · unsupervised'
                  : c.supervisorUserId === userId
                    ? 'You supervised'
                    : c.observerUserId === userId
                      ? 'You observed'
                      : '';
              const awaiting = c.supervisorUserId === userId && !c.approvedBy;
              return (
                <View
                  key={c.id}
                  style={[styles.recentItem, i < recentCases.length - 1 && styles.recentItemBorder]}
                >
                  <Text style={styles.recentDate}>{formatDisplay(c.date)}</Text>
                  <Text style={styles.recentDiagnosis} numberOfLines={1}>{c.diagnosis}</Text>
                  <Text style={styles.recentDomains}>
                    {relation ? `${relation} · ` : ''}
                    {c.cobatriceDomains.length} domain{c.cobatriceDomains.length !== 1 ? 's' : ''}
                    {c.approvedBy && <Text style={styles.approvedTag}> · Approved</Text>}
                    {awaiting && <Text style={styles.unsyncedTag}> · Awaiting your approval</Text>}
                    {!c.synced && <Text style={styles.unsyncedTag}> · Pending sync</Text>}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
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
  approvedTag: { color: COLORS.success, fontWeight: '600' },
  filterRow: { flexGrow: 0, marginBottom: SPACING.sm },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: SPACING.xs,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  filterPillTextActive: { color: COLORS.white },
});
