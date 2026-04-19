import React, { useEffect, useState } from 'react';
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
import { getUserDirectory } from '../services/AuthService';
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
  const { cases, deleteCase, approveCase, revokeCaseApproval } = useCaseStore();
  const { procedures, fetchProcedures } = useProcedureStore();
  const { userId } = useAuthStore();
  const [directory, setDirectory] = useState<Record<string, string>>({});

  const caseLog = cases.find((c) => c.id === caseId);
  const linkedProcedures = procedures.filter((p) => p.caseId === caseId);
  const isOwner = !!caseLog && caseLog.ownerId === userId;
  const isSupervisor = !!caseLog && caseLog.supervisorUserId === userId;
  const isApproved = !!caseLog?.approvedBy;

  useEffect(() => {
    fetchProcedures();
    getUserDirectory().then(setDirectory).catch(() => setDirectory({}));
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

  async function handleApprove() {
    try {
      await approveCase(caseId);
    } catch (e) {
      Alert.alert('Could not approve', e instanceof Error ? e.message : String(e));
    }
  }

  function handleRevoke() {
    Alert.alert('Revoke approval', 'The owner will be notified in-app that approval was withdrawn. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeCaseApproval(caseId);
          } catch (e) {
            Alert.alert('Could not revoke', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

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
          <DetailRow
            label="Owner"
            value={
              caseLog.ownerId
                ? (isOwner ? 'You' : (directory[caseLog.ownerId] ?? 'Unknown user'))
                : 'Unowned (legacy)'
            }
          />
          <DetailRow
            label="Supervised by"
            value={
              caseLog.supervisorUserId
                ? (directory[caseLog.supervisorUserId] ?? 'Unknown')
                : caseLog.externalSupervisorName
                  ? `${caseLog.externalSupervisorName} (off-system)`
                  : '—'
            }
          />
          <DetailRow
            label="Observed by"
            value={caseLog.observerUserId ? (directory[caseLog.observerUserId] ?? 'Unknown') : '—'}
          />
          {caseLog.approvedBy && (
            <DetailRow
              label="Approved"
              value={
                `${caseLog.approvedBy === userId ? 'You' : (directory[caseLog.approvedBy] ?? 'Supervisor')}` +
                (caseLog.approvedAt ? ` · ${formatDateTime(caseLog.approvedAt)}` : '')
              }
            />
          )}
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

        {/* Approve / revoke — tagged supervisor only */}
        {isSupervisor && !isApproved && (
          <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.approveBtnText}>Approve Case</Text>
          </TouchableOpacity>
        )}
        {isSupervisor && isApproved && (
          <TouchableOpacity style={styles.revokeBtn} onPress={handleRevoke} activeOpacity={0.85}>
            <Ionicons name="close-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.revokeBtnText}>Revoke Approval</Text>
          </TouchableOpacity>
        )}

        {/* Delete — only the owner can remove a case */}
        {isOwner && (
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
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  approveBtnText: { fontSize: FONT_SIZE.md, color: COLORS.white, fontWeight: '700' },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  revokeBtnText: { fontSize: FONT_SIZE.sm, color: COLORS.warning, fontWeight: '600' },
});
