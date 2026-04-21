import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import {
  ManagedUser,
  UserRole,
  listUsers,
  createUser,
  updateUserRole,
  setUserDisabled,
  resetUserPassword,
  deleteUser,
} from '../services/AuthService';

// Admin-only screen. Lists every user in the mock server DB, creates new
// users, toggles their role between user/admin, resets passwords, and
// enable/disable. Per-case supervision is handled in the case form, not
// here.

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
};

const ROLE_ICON: Record<UserRole, React.ComponentProps<typeof Ionicons>['name']> = {
  admin: 'shield',
  user: 'person',
};

export function AdminPanelScreen() {
  const { userId: currentUserId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const u = await listUsers();
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  function handleCycleRole(u: ManagedUser) {
    if (u.id === currentUserId) {
      Alert.alert('Not allowed', "You can't change your own role while signed in.");
      return;
    }
    const next: UserRole = u.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Change role',
      `Change ${u.displayName} from ${ROLE_LABEL[u.role]} → ${ROLE_LABEL[next]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            await updateUserRole(u.id, next);
            void reload();
          },
        },
      ]
    );
  }

  function handleToggleDisabled(u: ManagedUser) {
    if (u.id === currentUserId) {
      Alert.alert('Not allowed', "You can't disable your own account.");
      return;
    }
    const action = u.disabled ? 'Enable' : 'Disable';
    Alert.alert(
      `${action} user`,
      `${action} ${u.displayName}?${u.disabled ? '' : ' Their active sessions will be revoked.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: u.disabled ? 'default' : 'destructive',
          onPress: async () => {
            await setUserDisabled(u.id, !u.disabled);
            void reload();
          },
        },
      ]
    );
  }

  function handleDelete(u: ManagedUser) {
    if (u.id === currentUserId) {
      Alert.alert('Not allowed', "You can't delete your own account.");
      return;
    }
    Alert.alert(
      'Delete user',
      `Permanently delete ${u.displayName}? This removes their sessions and assignments too. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(u.id);
            void reload();
          },
        },
      ]
    );
  }

  function handleResetPassword(u: ManagedUser) {
    // Server-side Edge Function sends a Supabase recovery email to the
    // user's address — the admin never sees the password. This avoids
    // the plaintext-over-chat anti-pattern the old flow encouraged.
    Alert.alert(
      'Send password reset email',
      `Send a password-reset link to ${u.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await resetUserPassword(u.id, '');
              Alert.alert('Email sent', `${u.email} will receive a reset link.`);
            } catch (e) {
              Alert.alert('Could not send reset', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>User Management</Text>
            <Text style={styles.subhead}>{users.length} user{users.length !== 1 ? 's' : ''} in the server DB</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.8}>
            <Ionicons name="person-add" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>New user</Text>
          </TouchableOpacity>
        </View>

        {users.map((u) => {
          return (
            <View key={u.id} style={[styles.userCard, u.disabled && styles.userCardDisabled]}>
              <View style={styles.userTop}>
                <View style={[styles.roleBadge, styles[`role_${u.role}`]]}>
                  <Ionicons name={ROLE_ICON[u.role]} size={14} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {u.displayName}
                    {u.id === currentUserId ? '  · you' : ''}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                </View>
                <TouchableOpacity style={styles.chip} onPress={() => handleCycleRole(u)} activeOpacity={0.7}>
                  <Text style={styles.chipText}>{ROLE_LABEL[u.role]}</Text>
                  <Ionicons name="swap-horizontal" size={12} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.userActions}>
                <IconAction icon="key-outline" label="Reset pw" onPress={() => handleResetPassword(u)} />
                <IconAction
                  icon={u.disabled ? 'checkmark-circle-outline' : 'ban-outline'}
                  label={u.disabled ? 'Enable' : 'Disable'}
                  onPress={() => handleToggleDisabled(u)}
                  tone={u.disabled ? 'success' : 'warning'}
                />
                <IconAction
                  icon="trash-outline"
                  label="Delete"
                  onPress={() => handleDelete(u)}
                  tone="danger"
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <CreateUserModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); void reload(); }}
      />
    </SafeAreaView>
  );
}

function IconAction({
  icon, label, onPress, tone = 'default',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}) {
  const color = tone === 'danger' ? COLORS.error
    : tone === 'warning' ? COLORS.warning
    : tone === 'success' ? COLORS.success
    : COLORS.primary;
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Create user modal ───────────────────────────────────────────────────────
function CreateUserModal({
  visible, onClose, onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setEmail(''); setDisplayName(''); setRole('user'); setPassword(''); setError(''); setBusy(false);
  }

  async function handleCreate() {
    setError('');
    setBusy(true);
    try {
      await createUser({ email, displayName, role, password });
      reset();
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} disabled={busy}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New user</Text>
          <TouchableOpacity onPress={handleCreate} disabled={busy}>
            <Text style={[styles.modalDone, busy && { opacity: 0.5 }]}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Dr Alice Nguyen"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            editable={!busy}
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="alice@trainee.demo"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Role</Text>
          <View style={styles.roleRow}>
            {(['user', 'admin'] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rolePick, role === r && styles.rolePickActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Ionicons name={ROLE_ICON[r]} size={18} color={role === r ? COLORS.white : COLORS.textMuted} />
                <Text style={[styles.rolePickText, role === r && styles.rolePickTextActive]}>{ROLE_LABEL[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Temporary password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  heading: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  subhead: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
  },
  addBtnText: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.sm },

  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userCardDisabled: { opacity: 0.55 },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  roleBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  role_admin: { backgroundColor: COLORS.error },
  role_user: { backgroundColor: COLORS.primary },
  userName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    backgroundColor: COLORS.background, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.primary },

  userActions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  modalCancel: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, width: 60 },
  modalDone: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '700', width: 60, textAlign: 'right' },
  modalBody: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md, color: COLORS.text, minHeight: 48, backgroundColor: COLORS.white,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginTop: SPACING.md },

  roleRow: { flexDirection: 'row', gap: SPACING.sm },
  rolePick: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  rolePickActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolePickText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textMuted },
  rolePickTextActive: { color: COLORS.white },

});
