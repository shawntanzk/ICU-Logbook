import React, { useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { useAuthStore } from '../store/authStore';
import { ProcedureLog } from '../models/ProcedureLog';
import { Card } from '../components/Card';
import {
  COLORS,
  FONT_SIZE,
  SPACING,
  COBATRICE_DOMAINS,
  ORGAN_SYSTEMS,
  SUPERVISION_LEVELS,
  RADIUS,
} from '../utils/constants';
import { formatDisplay, formatDateTime } from '../utils/dateUtils';
import type { CasesStackProps } from '../navigation/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ChipList({ ids, options }: { ids: string[]; options: { id: string; label: string }[] }) {
  return (
    <View style={styles.chipList}>
      {ids.map((id) => {
        const opt = options.find((o) => o.id === id);
        return opt ? (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>{opt.label}</Text>
          </View>
        ) : null;
      })}
    </View>
  );
}

function ProcedureItem({ proc }: { proc: ProcedureLog }) {
  return (
    <View style={styles.procItem}>
      <View style={styles.procLeft}>
        <Text style={styles.procType}>{proc.procedureType}</Text>
        <Text style={styles.procMeta}>
          {proc.attempts} attempt{proc.attempts !== 1 ? 's' : ''}
          {proc.complications ? ` · ${proc.complications}` : ''}
        </Text>
      </View>
      <View style={[styles.procBadge, proc.success ? styles.procSuccess : styles.procFail]}>
        <Text style={styles.procBadgeText}>{proc.success ? 'Success' : 'Fail'}</Text>
      </View>
    </View>
  );
}

export function CaseDetailScreen({ route, navigation }: CasesStackProps<'CaseDetail'>) {
  const { caseId } = route.params;
  const { cases, deleteCase } = useCaseStore();
  const { procedures, fetchProcedures } = useProcedureStore();
  const { role } = useAuthStore();
  const isSupervisor = role === 'supervisor';

  const caseLog = cases.find((c) => c.id === caseId);
  const linkedProcedures = procedures.filter((p) => p.caseId === caseId);

  useEffect(() => {
    fetchProcedures();
  }, []);

  // Mock AI summary — replace with Claude API call when ready
  function handleAISummary() {
    if (!caseLog) return;
    const domainLabels = caseLog.cobatriceDomains
      .map((id) => COBATRICE_DOMAINS.find((d) => d.id === id)?.label)
      .filter(Boolean)
      .slice(0, 2)
      .join(' and ');
    const systemLabels = caseLog.organSystems
      .map((id) => ORGAN_SYSTEMS.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    Alert.alert(
      '✦ AI Clinical Summary',
      `This case involved ${systemLabels || 'multiple organ systems'} with a primary diagnosis of ${caseLog.diagnosis}. ` +
        `Management was conducted at ${caseLog.supervisionLevel} level, demonstrating competency in ${domainLabels || 'key CoBaTrICE domains'}. ` +
        (caseLog.reflection
          ? `The trainee reflected: "${caseLog.reflection.substring(0, 100)}${caseLog.reflection.length > 100 ? '…' : ''}"`
          : 'No reflection recorded for this case.') +
        '\n\n⚠ This is a mock summary. Connect to Claude API for AI-generated insights.',
      [{ text: 'Close' }]
    );
  }

  if (!caseLog) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Case not found.</Text>
      </SafeAreaView>
    );
  }

  const supervisionLabel =
    SUPERVISION_LEVELS.find((s) => s.id === caseLog.supervisionLevel)?.label ?? caseLog.supervisionLevel;

  function handleDelete() {
    Alert.alert('Delete Case', 'This action cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCase(caseId);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Supervisor read-only banner */}
        {isSupervisor && (
          <View style={styles.supervisorBanner}>
            <Ionicons name="ribbon" size={14} color={COLORS.accent} />
            <Text style={styles.supervisorBannerText}>Supervisor View · Read Only</Text>
          </View>
        )}

        {/* AI Summary button */}
        <TouchableOpacity style={styles.aiBtn} onPress={handleAISummary} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={16} color={COLORS.white} />
          <Text style={styles.aiBtnText}>AI Clinical Summary</Text>
          <View style={styles.aiBeta}><Text style={styles.aiBetaText}>MOCK</Text></View>
        </TouchableOpacity>

        {/* Primary info */}
        <Section title="Case Information">
          <DetailRow label="Date" value={formatDisplay(caseLog.date)} />
          <DetailRow label="Diagnosis" value={caseLog.diagnosis} />
          {caseLog.icd10Code ? <DetailRow label="ICD-10" value={caseLog.icd10Code} /> : null}
          <DetailRow label="Supervision" value={supervisionLabel} />
        </Section>

        {/* Organ systems */}
        <Section title="Organ Systems">
          <ChipList ids={caseLog.organSystems} options={ORGAN_SYSTEMS} />
        </Section>

        {/* CoBaTrICE domains */}
        <Section title="CoBaTrICE Domains">
          <ChipList ids={caseLog.cobatriceDomains} options={COBATRICE_DOMAINS} />
        </Section>

        {/* Reflection */}
        {caseLog.reflection ? (
          <Section title="Reflection">
            <Text style={styles.reflection}>{caseLog.reflection}</Text>
          </Section>
        ) : null}

        {/* Linked procedures */}
        {linkedProcedures.length > 0 && (
          <Section title={`Linked Procedures (${linkedProcedures.length})`}>
            {linkedProcedures.map((p) => (
              <ProcedureItem key={p.id} proc={p} />
            ))}
          </Section>
        )}

        {/* Meta */}
        <Text style={styles.meta}>
          Logged {formatDateTime(caseLog.createdAt)}
          {caseLog.synced ? ' · Synced' : ' · Not synced'}
        </Text>

        {/* Delete — hidden from supervisors */}
        {!isSupervisor && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={styles.deleteBtnText}>Delete Case</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  notFound: { textAlign: 'center', marginTop: SPACING.xxl, color: COLORS.textMuted },
  supervisorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent + '18',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  supervisorBannerText: { fontSize: FONT_SIZE.sm, color: COLORS.accent, fontWeight: '600' },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C3EC5',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  aiBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.white, fontWeight: '600', flex: 1 },
  aiBeta: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  aiBetaText: { fontSize: 9, color: COLORS.white, fontWeight: '700' },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, width: 100 },
  detailValue: { fontSize: FONT_SIZE.sm, color: COLORS.text, flex: 1, fontWeight: '500' },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  chipText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '500' },
  reflection: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 22 },
  procItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  procLeft: { flex: 1 },
  procType: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  procMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  procBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  procSuccess: { backgroundColor: COLORS.successLight },
  procFail: { backgroundColor: COLORS.errorLight },
  procBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  deleteBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.error, fontWeight: '600' },
});
