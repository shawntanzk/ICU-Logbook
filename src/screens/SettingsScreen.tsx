import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStore } from '../store/syncStore';
import { useAuthStore } from '../store/authStore';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { Card } from '../components/Card';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';
import { formatDateTime } from '../utils/dateUtils';

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress || loading}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={destructive ? COLORS.error : COLORS.primary} />
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <View style={styles.rowRight}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : null}
        {onPress && !loading ? <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} /> : null}
      </View>
    </TouchableOpacity>
  );
}

// Sync status pill
function SyncPill({ pending, syncing }: { pending: number; syncing: boolean }) {
  if (syncing) {
    return (
      <View style={[styles.pill, styles.pillSyncing]}>
        <ActivityIndicator size="small" color={COLORS.white} style={{ transform: [{ scale: 0.7 }] }} />
        <Text style={styles.pillText}>Syncing…</Text>
      </View>
    );
  }
  if (pending > 0) {
    return (
      <View style={[styles.pill, styles.pillPending]}>
        <Text style={styles.pillText}>{pending} Pending</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.pillSynced]}>
      <Ionicons name="checkmark-circle" size={12} color={COLORS.white} />
      <Text style={styles.pillText}>Synced</Text>
    </View>
  );
}

export function SettingsScreen() {
  const { cases } = useCaseStore();
  const { procedures } = useProcedureStore();
  const { isSyncing, status, lastResult, error, sync, refreshStatus } = useSyncStore();
  const { userName, role, logout } = useAuthStore();

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleSync() {
    await sync();
    if (error) Alert.alert('Sync failed', error);
    else if (lastResult) {
      Alert.alert(
        'Sync complete',
        lastResult.synced > 0
          ? `${lastResult.synced} record${lastResult.synced !== 1 ? 's' : ''} synced to Supabase.`
          : 'Everything is already up to date.'
      );
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  function handleClearData() {
    Alert.alert('Clear All Data', 'This permanently deletes all local data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => Alert.alert('Not implemented', 'Data clearing will be added in a future release.'),
      },
    ]);
  }

  function handleExport() {
    Alert.alert('Export Data', 'CSV/PDF export will be available in a future release.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User card */}
        <Card style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name={role === 'supervisor' ? 'ribbon' : 'school'} size={28} color={COLORS.white} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName || 'User'}</Text>
            <Text style={styles.userRole}>{role === 'supervisor' ? 'Supervisor · Read Only' : 'Trainee'}</Text>
          </View>
          <SyncPill pending={status.pendingCount} syncing={isSyncing} />
        </Card>

        {/* Sync panel */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>

          {/* Status row */}
          <View style={styles.syncStatusRow}>
            <View style={styles.syncStatusLeft}>
              <Text style={styles.syncStatusLabel}>
                {status.pendingCount > 0
                  ? `${status.pendingCount} record${status.pendingCount !== 1 ? 's' : ''} pending upload`
                  : 'All data synced'}
              </Text>
              {status.lastSyncedAt && (
                <Text style={styles.syncStatusSub}>Last synced {formatDateTime(status.lastSyncedAt)}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Ionicons name="cloud-upload" size={18} color={COLORS.white} />
            )}
            <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>

          <View style={styles.syncNote}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.syncNoteText}>
              Using mock Supabase client. See SETUP.md to connect a real backend.
            </Text>
          </View>
        </Card>

        {/* Data summary */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Data Summary</Text>
          <SettingRow icon="document-text-outline" label="Total Cases" value={String(cases.length)} />
          <SettingRow icon="medkit-outline" label="Total Procedures" value={String(procedures.length)} />
        </Card>

        {/* Data management */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <SettingRow icon="download-outline" label="Export Data" onPress={handleExport} />
          <SettingRow icon="trash-outline" label="Clear All Data" onPress={handleClearData} destructive />
        </Card>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingRow icon="school-outline" label="CoBaTrICE Framework" value="12 Domains" />
          <SettingRow icon="shield-checkmark-outline" label="Storage" value="Local SQLite" />
          <SettingRow icon="cloud-outline" label="Backend" value="Supabase (mock)" />
          <SettingRow icon="code-slash-outline" label="Built with" value="React Native · Expo" />
        </Card>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          ICU Logbook is designed to support clinical training documentation.{'\n'}
          Not a substitute for professional medical judgement.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  userRole: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  pillSynced: { backgroundColor: COLORS.success },
  pillPending: { backgroundColor: COLORS.warning },
  pillSyncing: { backgroundColor: COLORS.primary },
  pillText: { fontSize: FONT_SIZE.xs, color: COLORS.white, fontWeight: '600' },
  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  syncStatusRow: { marginBottom: SPACING.md },
  syncStatusLeft: { flex: 1 },
  syncStatusLabel: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500' },
  syncStatusSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { fontSize: FONT_SIZE.md, color: COLORS.white, fontWeight: '600' },
  syncNote: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'flex-start' },
  syncNoteText: { flex: 1, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  rowLabelDestructive: { color: COLORS.error },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  rowValue: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  logoutBtnText: { fontSize: FONT_SIZE.md, color: COLORS.error, fontWeight: '600' },
  footer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
});
