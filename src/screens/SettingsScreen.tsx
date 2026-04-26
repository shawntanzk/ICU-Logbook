import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import {
  listIdentities,
  linkGoogleIdentity,
  unlinkGoogleIdentity,
  deleteOwnAccount,
  LinkedIdentity,
} from '../services/AuthService';
import { wipeLocalData } from '../database/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStore } from '../store/syncStore';
import { useAuthStore } from '../store/authStore';
import { useCaseStore } from '../store/caseStore';
import { useProcedureStore } from '../store/procedureStore';
import { useConsentStore } from '../store/consentStore';
import { useOfflineStore } from '../store/offlineStore';
import { useGuestStore } from '../store/guestStore';
import { Card } from '../components/Card';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';
import { formatDateTime } from '../utils/dateUtils';
import type { SettingsStackParamList } from '../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export function SettingsScreen({ navigation }: Props) {
  const { cases } = useCaseStore();
  const { procedures } = useProcedureStore();
  const { isSyncing, status, lastResult, error, sync, refreshStatus } = useSyncStore();
  const { userName, role, logout } = useAuthStore();
  const consentStatus = useConsentStore((s) => s.status);
  const { offlineOnly, setOfflineOnly } = useOfflineStore();
  const { isGuest, exitGuestMode } = useGuestStore();

  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [identityBusy, setIdentityBusy] = useState(false);

  const refreshIdentities = useCallback(async () => {
    try {
      const rows = await listIdentities();
      setIdentities(rows);
    } catch {
      // Non-fatal: identities are a nice-to-have in Settings.
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshIdentities();
  }, [refreshIdentities]);

  const googleLinked = identities.some((i) => i.provider === 'google');
  const hasEmail = identities.some((i) => i.provider === 'email');

  async function handleLinkGoogle() {
    setIdentityBusy(true);
    try {
      const result = await linkGoogleIdentity();
      if (!result.ok) {
        if (!result.cancelled) Alert.alert('Could not link Google', result.error ?? 'Unknown error.');
        return;
      }
      Alert.alert('Google linked', 'You can now sign in with Google on any device.');
      await refreshIdentities();
    } finally {
      setIdentityBusy(false);
    }
  }

  function handleUnlinkGoogle() {
    if (!hasEmail) {
      Alert.alert(
        'Set a password first',
        'Google is currently your only sign-in method. Add a password before unlinking so you don\'t lose access to this account.'
      );
      return;
    }
    Alert.alert(
      'Unlink Google?',
      'You\'ll still be able to sign in with your email and password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setIdentityBusy(true);
            try {
              const result = await unlinkGoogleIdentity();
              if (!result.ok) {
                Alert.alert('Could not unlink Google', result.error ?? 'Unknown error.');
                return;
              }
              await refreshIdentities();
            } finally {
              setIdentityBusy(false);
            }
          },
        },
      ]
    );
  }

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

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'Permanently delete your account, every case and procedure you own on this device, and every copy on the server. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            // Two-step to discourage accidental taps.
            Alert.alert(
              'Final confirmation',
              'Type DELETE on paper first if you need to. There is no undo.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand — delete',
                  style: 'destructive',
                  onPress: async () => {
                    const result = await deleteOwnAccount();
                    if (!result.ok) {
                      Alert.alert('Could not delete account', result.error ?? 'Unknown error.');
                      return;
                    }
                    try {
                      await wipeLocalData();
                    } catch {
                      // Server delete already succeeded; a local residue
                      // will be cleared on next launch by the auth guard.
                    }
                    await logout();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function handleExport() {
    navigation.navigate('Export');
  }

  function handleConsent() {
    navigation.navigate('Consent');
  }

  function handleAdmin() {
    navigation.navigate('AdminPanel');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Guest mode banner ──────────────────────────────────────────── */}
        {isGuest && (
          <Card style={styles.guestCard}>
            <View style={styles.guestIconWrap}>
              <Ionicons name="phone-portrait-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Offline mode</Text>
              <Text style={styles.guestBody}>
                You are using ICU Logbook without an account. All data is stored
                locally on this device and will never leave it.
              </Text>
              <Text style={[styles.guestBody, { marginTop: 6 }]}>
                Sign in or create an account to enable cloud sync and access your
                data across devices. Your existing entries will be migrated automatically.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.guestSignInBtn}
              onPress={async () => {
                await exitGuestMode();
                // RootNavigator will re-render to Login screen automatically.
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
              <Text style={styles.guestSignInText}>Sign in to sync</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Authenticated user card ─────────────────────────────────────── */}
        {!isGuest && (
          <Card style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons
                name={role === 'admin' ? 'shield' : 'person'}
                size={28}
                color={COLORS.white}
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName || 'User'}</Text>
              <Text style={styles.userRole}>
                {role === 'admin' ? 'Administrator' : 'User'}
              </Text>
            </View>
            <SyncPill pending={status.pendingCount} syncing={isSyncing} />
          </Card>
        )}

        {/* Sync panel — hidden for guests */}
        {!isGuest && <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>

          {/* Offline-only toggle. When on, the app never talks to
              Supabase — local logbook only, no cross-device sync. */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelWrap}>
              <Text style={styles.toggleLabel}>Offline-only mode</Text>
              <Text style={styles.toggleHint}>
                When on, nothing leaves this device. Logs stay local and won't appear in the web app.
              </Text>
            </View>
            <Switch value={offlineOnly} onValueChange={(v) => setOfflineOnly(v)} />
          </View>

          {/* Status row */}
          <View style={styles.syncStatusRow}>
            <View style={styles.syncStatusLeft}>
              <Text style={styles.syncStatusLabel}>
                {offlineOnly
                  ? 'Sync disabled (offline-only mode)'
                  : status.pendingCount > 0
                    ? `${status.pendingCount} record${status.pendingCount !== 1 ? 's' : ''} pending upload`
                    : 'All data synced'}
              </Text>
              {status.lastSyncedAt && !offlineOnly && (
                <Text style={styles.syncStatusSub}>Last synced {formatDateTime(status.lastSyncedAt)}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncBtn, (isSyncing || offlineOnly) && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={isSyncing || offlineOnly}
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
              Two-way sync with Supabase. Conflicting edits keep your local copy and flag the row for manual review.
            </Text>
          </View>

          <SettingRow
            icon={status.conflictCount > 0 ? 'warning-outline' : 'git-compare-outline'}
            label="Sync conflicts"
            value={
              status.conflictCount > 0
                ? `${status.conflictCount} to review`
                : 'None'
            }
            onPress={() => navigation.navigate('Conflicts')}
            destructive={status.conflictCount > 0}
          />
        </Card>}

        {/* Data summary — always visible */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Data Summary</Text>
          <SettingRow icon="document-text-outline" label="Total Cases" value={String(cases.length)} />
          <SettingRow icon="medkit-outline" label="Total Procedures" value={String(procedures.length)} />
        </Card>

        {/* Data management — hidden for guests (no account to delete, consent not relevant) */}
        {!isGuest && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Data Sharing & Export</Text>
            <SettingRow
              icon="shield-checkmark-outline"
              label="Data sharing consent"
              value={
                consentStatus === 'none'
                  ? 'Private'
                  : consentStatus.charAt(0).toUpperCase() + consentStatus.slice(1)
              }
              onPress={handleConsent}
            />
            <SettingRow
              icon="download-outline"
              label="Export (FHIR / openEHR / JSON-LD)"
              onPress={handleExport}
            />
            <SettingRow
              icon="trash-outline"
              label="Delete my account"
              onPress={handleDeleteAccount}
              destructive
            />
          </Card>
        )}

        {/* Sign-in methods — hidden for guests */}
        {!isGuest && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Sign-in Methods</Text>

            <SettingRow
              icon="mail-outline"
              label="Email & Password"
              value={hasEmail ? 'Linked' : 'Not linked'}
            />

            <SettingRow
              icon="logo-google"
              label={googleLinked ? 'Google — unlink' : 'Link Google account'}
              value={googleLinked ? 'Linked' : undefined}
              onPress={googleLinked ? handleUnlinkGoogle : handleLinkGoogle}
              loading={identityBusy}
              destructive={googleLinked}
            />

            <SettingRow
              icon="key-outline"
              label="Change password"
              onPress={() => navigation.navigate('ChangePassword')}
            />

            <View style={styles.syncNote}>
              <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.syncNoteText}>
                Linking Google lets you sign into this same account with either method. You can link or unlink at any time.
              </Text>
            </View>
          </Card>
        )}

        {/* Admin — only visible to admins */}
        {!isGuest && role === 'admin' && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <SettingRow
              icon="people-outline"
              label="Manage users"
              onPress={handleAdmin}
            />
          </Card>
        )}

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingRow icon="school-outline" label="CoBaTrICE Framework" value="12 Domains" />
          <SettingRow icon="shield-checkmark-outline" label="Storage" value="Local SQLite" />
          <SettingRow icon="cloud-outline" label="Backend" value="Supabase" />
          <SettingRow icon="code-slash-outline" label="Built with" value="React Native · Expo" />
        </Card>

        {/* Sign out — only for authenticated users */}
        {!isGuest && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        )}

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  toggleLabelWrap: { flex: 1 },
  toggleLabel: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500' },
  toggleHint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
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
  guestCard: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  guestIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight ?? '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  guestInfo: { flex: 1 },
  guestTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  guestBody: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 20 },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  guestSignInText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.white },
  footer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
});
