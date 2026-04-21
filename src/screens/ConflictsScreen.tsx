import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SyncService } from '../services/SyncService';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { formatDateTime } from '../utils/dateUtils';

type TableName = 'case_logs' | 'procedure_logs';
interface ConflictRow {
  table: TableName;
  id: string;
  updated_at: string;
  server_updated_at: string | null;
  sync_last_error: string | null;
}

// Surfaces rows flagged conflict=1 and lets the user pick a side. The
// service's resolveKeepLocal / resolveKeepRemote does the SQL; this
// screen is just a typed list with two buttons per row.
export function ConflictsScreen() {
  const [rows, setRows] = useState<ConflictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await SyncService.listConflicts();
      setRows(next);
    } catch (e) {
      Alert.alert('Could not load conflicts', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(row: ConflictRow, side: 'local' | 'remote') {
    try {
      if (side === 'local') await SyncService.resolveKeepLocal(row.table, row.id);
      else await SyncService.resolveKeepRemote(row.table, row.id);
      setRows((prev) => prev.filter((r) => !(r.table === row.table && r.id === row.id)));
      // Refresh the affected store so lists reflect the new state.
      if (row.table === 'case_logs') await useCaseStore.getState().fetchCases();
      else await useProcedureStore.getState().fetchProcedures();
    } catch (e) {
      Alert.alert('Could not resolve', e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <EmptyState
          icon="checkmark-circle"
          title="No conflicts"
          subtitle="Everything is synced cleanly between this device and the cloud."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.intro}>
          These rows were edited on two devices before either synced. Pick which copy to keep —
          your next sync will push the chosen version.
        </Text>
        {rows.map((row) => (
          <Card key={`${row.table}:${row.id}`} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Ionicons name="warning" size={16} color={COLORS.warning} />
              <Text style={styles.rowTitle}>
                {row.table === 'case_logs' ? 'Case' : 'Procedure'} · {row.id.slice(0, 8)}…
              </Text>
            </View>
            <View style={styles.rowMetaRow}>
              <Text style={styles.rowMetaLabel}>Your edit</Text>
              <Text style={styles.rowMetaValue}>{formatDateTime(row.updated_at)}</Text>
            </View>
            <View style={styles.rowMetaRow}>
              <Text style={styles.rowMetaLabel}>Last seen on server</Text>
              <Text style={styles.rowMetaValue}>
                {row.server_updated_at ? formatDateTime(row.server_updated_at) : '—'}
              </Text>
            </View>
            {row.sync_last_error && (
              <Text style={styles.errorText}>{row.sync_last_error}</Text>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.keepLocal]}
                onPress={() => resolve(row, 'local')}
                activeOpacity={0.85}
              >
                <Ionicons name="phone-portrait" size={16} color={COLORS.white} />
                <Text style={styles.actionText}>Keep mine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.keepRemote]}
                onPress={() => resolve(row, 'remote')}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-download" size={16} color={COLORS.white} />
                <Text style={styles.actionText}>Keep server</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  intro: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.md, lineHeight: 20 },
  rowCard: { marginBottom: SPACING.md, padding: SPACING.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  rowTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  rowMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowMetaLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  rowMetaValue: { fontSize: FONT_SIZE.xs, color: COLORS.text, fontWeight: '500' },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
  },
  keepLocal: { backgroundColor: COLORS.primary },
  keepRemote: { backgroundColor: COLORS.textMuted },
  actionText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.sm },
});
