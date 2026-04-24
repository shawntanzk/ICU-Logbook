import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/StatCard';
import { Card } from '../components/Card';
import { DomainBar } from '../components/DomainBar';
import { CaseService } from '../services/CaseService';
import { ArterialLineService } from '../services/ArterialLineService';
import { CVCService } from '../services/CVCService';
import { USSService } from '../services/USSService';
import { RegionalBlockService } from '../services/RegionalBlockService';
import { AirwayService } from '../services/AirwayService';
import {
  COBATRICE_DOMAINS, COLORS, FONT_SIZE, SPACING, RADIUS,
} from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import type { DashboardStackProps } from '../navigation/types';

type CaseFilter = 'all' | 'logged' | 'supervised' | 'observed';

const FILTER_OPTIONS: { id: CaseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'logged', label: 'Logged' },
  { id: 'supervised', label: 'Supervised' },
  { id: 'observed', label: 'Observed' },
];

// ── Extra stats loaded asynchronously ────────────────────────────────────────
interface ExtraStats {
  specialtyCounts: Record<string, number>;
  levelCounts: Record<string, number>;
  outcomeCounts: Record<string, number>;
  mortalityRate: number | null;
  ussTypeCounts: Record<string, number>;
  blockTypeCounts: Record<string, number>;
  artSiteCounts: Record<string, number>;
  cvcSiteCounts: Record<string, number>;
  airwayCount: number;
  airwayDAECount: number;
  artSuccessRate: number | null;
  cvcSuccessRate: number | null;
  blockSuccessRate: number | null;
}

const EMPTY_EXTRA: ExtraStats = {
  specialtyCounts: {}, levelCounts: {}, outcomeCounts: {},
  mortalityRate: null, ussTypeCounts: {}, blockTypeCounts: {},
  artSiteCounts: {}, cvcSiteCounts: {}, airwayCount: 0,
  airwayDAECount: 0, artSuccessRate: null, cvcSuccessRate: null,
  blockSuccessRate: null,
};

function pct(rate: number | null): string {
  if (rate === null) return '–';
  return `${Math.round(rate * 100)}%`;
}

function topEntries(counts: Record<string, number>, n = 4): [string, number][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function DashboardScreen({ navigation }: DashboardStackProps<'DashboardHome'>) {
  const { cases, casesThisMonth, domainCounts, fetchCases } = useCaseStore();
  const { procedures, successRate, fetchProcedures } = useProcedureStore();
  const { userId, userName, role } = useAuthStore();
  const [filter, setFilter] = useState<CaseFilter>('all');
  const [extra, setExtra] = useState<ExtraStats>(EMPTY_EXTRA);
  const [refreshing, setRefreshing] = useState(false);

  const loadExtra = useCallback(async () => {
    try {
      const [
        specialtyCounts, levelCounts, outcomeCounts, mortalityRate,
        ussTypeCounts, blockTypeCounts, artSiteCounts, cvcSiteCounts,
        airwayLogs, airwayDAECount, artSuccessRate, cvcSuccessRate, blockSuccessRate,
      ] = await Promise.all([
        CaseService.getSpecialtyCounts(),
        CaseService.getLevelOfCareCounts(),
        CaseService.getOutcomeCounts(),
        CaseService.getMortalityRate(),
        USSService.getStudyTypeCounts(),
        RegionalBlockService.getBlockTypeCounts(),
        ArterialLineService.getSiteCounts(),
        CVCService.getSiteCounts(),
        AirwayService.findAll(),
        AirwayService.getDAECount(),
        ArterialLineService.getSuccessRate(),
        CVCService.getSuccessRate(),
        RegionalBlockService.getSuccessRate(),
      ]);
      setExtra({
        specialtyCounts, levelCounts, outcomeCounts, mortalityRate,
        ussTypeCounts, blockTypeCounts, artSiteCounts, cvcSiteCounts,
        airwayCount: airwayLogs.length,
        airwayDAECount, artSuccessRate, cvcSuccessRate, blockSuccessRate,
      });
    } catch {
      // non-critical — silently ignore
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCases(), fetchProcedures(), loadExtra()]);
    setRefreshing(false);
  }, [fetchCases, fetchProcedures, loadExtra]);

  useEffect(() => {
    fetchCases();
    fetchProcedures();
    loadExtra();
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
    () => cases.filter((c) => c.supervisorUserId === userId && !c.approvedBy).length,
    [cases, userId]
  );

  const filteredCases = useMemo(() => {
    switch (filter) {
      case 'logged':    return cases.filter((c) => c.ownerId === userId);
      case 'supervised':return cases.filter((c) => c.supervisorUserId === userId);
      case 'observed':  return cases.filter((c) => c.observerUserId === userId);
      default:          return cases;
    }
  }, [cases, filter, userId]);

  const maxDomainCount = Math.max(...Object.values(domainCounts), 1);
  const recentCases = filteredCases.slice(0, 5);
  const domainsTouched = Object.values(domainCounts).filter((c) => c > 0).length;

  // Derived
  const totalOutcome = Object.values(extra.outcomeCounts).reduce((a, b) => a + b, 0);
  const l2Count = extra.levelCounts['2'] ?? 0;
  const l3Count = extra.levelCounts['3'] ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Header ──────────────────────────────────────────── */}
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

        {/* ── Top stats ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard label="Cases Logged"  value={ownedCount}        icon="document-text"    />
          <View style={styles.statGap} />
          <StatCard label="Supervised"    value={supervisedCount}    icon="shield-checkmark" color={COLORS.accent} />
          <View style={styles.statGap} />
          <StatCard label="This Month"    value={casesThisMonth}     icon="calendar"         color={COLORS.primaryLight} />
        </View>

        <View style={[styles.statsRow, { marginTop: -SPACING.sm }]}>
          <StatCard label="Procedures"   value={procedures.length}  icon="medkit"           color={COLORS.warning} />
          <View style={styles.statGap} />
          <StatCard label="Airway Logs"  value={extra.airwayCount}  icon="thermometer"      color='#0891B2' />
          <View style={styles.statGap} />
          <StatCard label="USS Studies"  value={Object.values(extra.ussTypeCounts).reduce((a,b)=>a+b,0)} icon="radio" color='#0F766E' />
        </View>

        {pendingApprovalCount > 0 && (
          <Card style={[styles.section, { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Ionicons name="hourglass" size={18} color={COLORS.warning} />
              <Text style={{ fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text }}>
                {pendingApprovalCount} case{pendingApprovalCount !== 1 ? 's' : ''} awaiting your approval
              </Text>
            </View>
          </Card>
        )}

        {/* ── Level of care breakdown ──────────────────────────── */}
        {(l2Count + l3Count) > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Level of Care</Text>
            <View style={styles.statsRow}>
              <StatCard label="Level 2 (HDU)" value={l2Count} icon="git-network" color={COLORS.accent} />
              <View style={styles.statGap} />
              <StatCard label="Level 3 (ICU)" value={l3Count} icon="bed" color={COLORS.primaryLight} />
            </View>
          </Card>
        )}

        {/* ── Mortality ────────────────────────────────────────── */}
        {totalOutcome > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Outcomes ({totalOutcome} recorded)</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Mortality"
                value={pct(extra.mortalityRate)}
                icon="pulse"
                color={COLORS.error}
              />
              <View style={styles.statGap} />
              <StatCard
                label="Survived"
                value={`${(extra.outcomeCounts['survived_icu'] ?? 0) + (extra.outcomeCounts['survived_ward'] ?? 0)}`}
                icon="checkmark-circle"
                color={COLORS.success}
              />
            </View>
            {topEntries(extra.outcomeCounts).map(([outcome, count]) => (
              <MiniBar key={outcome} label={outcome.replace(/_/g, ' ')} count={count} max={totalOutcome} />
            ))}
          </Card>
        )}

        {/* ── Specialty mix ────────────────────────────────────── */}
        {Object.keys(extra.specialtyCounts).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Specialty Mix</Text>
            {topEntries(extra.specialtyCounts, 6).map(([spec, count]) => (
              <MiniBar key={spec} label={spec} count={count} max={ownedCount || 1} />
            ))}
          </Card>
        )}

        {/* ── Procedure success rates ──────────────────────────── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Procedure Performance</Text>
          <View style={styles.statsRow}>
            <StatCard label="Art Line Success" value={pct(extra.artSuccessRate)}  icon="pulse"         color={COLORS.primaryLight} />
            <View style={styles.statGap} />
            <StatCard label="CVC Success"      value={pct(extra.cvcSuccessRate)}  icon="git-network"   color={COLORS.accent} />
          </View>
          <View style={[styles.statsRow, { marginTop: -SPACING.sm }]}>
            <StatCard label="Block Success"  value={pct(extra.blockSuccessRate)} icon="body"          color='#D97706' />
            <View style={styles.statGap} />
            <StatCard label="DAE Episodes"   value={extra.airwayDAECount}        icon="thermometer"   color={COLORS.error} />
          </View>
        </Card>

        {/* ── USS breakdown ────────────────────────────────────── */}
        {Object.keys(extra.ussTypeCounts).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>USS Studies</Text>
            {topEntries(extra.ussTypeCounts, 6).map(([type, count]) => (
              <MiniBar
                key={type} label={type} count={count}
                max={Math.max(...Object.values(extra.ussTypeCounts), 1)}
              />
            ))}
          </Card>
        )}

        {/* ── Regional blocks ──────────────────────────────────── */}
        {Object.keys(extra.blockTypeCounts).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Regional Blocks</Text>
            {topEntries(extra.blockTypeCounts, 6).map(([type, count]) => (
              <MiniBar
                key={type} label={type} count={count}
                max={Math.max(...Object.values(extra.blockTypeCounts), 1)}
              />
            ))}
          </Card>
        )}

        {/* ── Competency map shortcut ──────────────────────────── */}
        <TouchableOpacity
          style={styles.competencyBanner}
          onPress={() => navigation.navigate('Competency')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.competencyBannerTitle}>Competency Map</Text>
            <Text style={styles.competencyBannerSub}>
              {domainsTouched} of {COBATRICE_DOMAINS.length} CoBaTrICE domains covered
            </Text>
          </View>
          <View style={styles.competencyBannerRight}>
            <View style={styles.competencyProgress}>
              {Array.from({ length: COBATRICE_DOMAINS.length }).map((_, i) => (
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

        {/* ── CoBaTrICE domain coverage ────────────────────────── */}
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

        {/* ── Recent cases ─────────────────────────────────────── */}
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
                  <Text style={styles.recentMeta}>
                    {c.primarySpecialty ? `${c.primarySpecialty} · ` : ''}
                    {c.levelOfCare ? `L${c.levelOfCare} · ` : ''}
                    {relation ? `${relation} · ` : ''}
                    {c.cobatriceDomains.length} domain{c.cobatriceDomains.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.recentTags}>
                    {c.outcome ? `${c.outcome.replace(/_/g, ' ')} · ` : ''}
                    {c.approvedBy && <Text style={styles.approvedTag}>Approved · </Text>}
                    {awaiting && <Text style={styles.unsyncedTag}>Awaiting approval · </Text>}
                    {!c.synced && <Text style={styles.unsyncedTag}>Pending sync</Text>}
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

// ── Mini bar for compact breakdowns ──────────────────────────────────────────
function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? count / max : 0;
  return (
    <View style={miniStyles.row}>
      <Text style={miniStyles.label} numberOfLines={1}>{label}</Text>
      <View style={miniStyles.barBg}>
        <View style={[miniStyles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      <Text style={miniStyles.count}>{count}</Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs + 2 },
  label: { width: 130, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textTransform: 'capitalize' },
  barBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginHorizontal: SPACING.sm },
  barFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  count: { width: 24, textAlign: 'right', fontSize: FONT_SIZE.xs, color: COLORS.text, fontWeight: '600' },
});

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: SPACING.lg,
  },
  headerGreeting: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  supervisorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.accent + '18',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  supervisorBadgeText: { fontSize: FONT_SIZE.xs, color: COLORS.accent, fontWeight: '700' },

  statsRow: { flexDirection: 'row', marginBottom: SPACING.md },
  statGap: { width: SPACING.sm },

  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZE.md, fontWeight: '700',
    color: COLORS.text, marginBottom: SPACING.md,
  },
  emptyNote: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
    textAlign: 'center', paddingVertical: SPACING.sm,
  },

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

  filterRow: { flexGrow: 0, marginBottom: SPACING.sm },
  filterPill: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, marginRight: SPACING.xs,
  },
  filterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterPillText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '600' },
  filterPillTextActive: { color: COLORS.white },

  recentItem: { paddingVertical: SPACING.sm },
  recentItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recentDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  recentDiagnosis: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500', marginVertical: 2 },
  recentMeta: { fontSize: FONT_SIZE.xs, color: COLORS.accent },
  recentTags: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },
  unsyncedTag: { color: COLORS.warning },
  approvedTag: { color: COLORS.success, fontWeight: '600' },
});
