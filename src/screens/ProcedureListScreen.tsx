import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProcedureStore } from '../store/procedureStore';
import { useAuthStore } from '../store/authStore';
import { ProcedureLog } from '../models/ProcedureLog';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import { getUserDirectory } from '../services/AuthService';
import type { ProceduresStackProps } from '../navigation/types';

function ProcedureItem({
  item,
  onPress,
  directory,
  currentUserId,
  onApprove,
  onRevoke,
}: {
  item: ProcedureLog;
  onPress: () => void;
  directory: Record<string, string>;
  currentUserId: string | null;
  onApprove: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const ownerName = item.ownerId ? directory[item.ownerId] ?? 'Unknown' : 'Unowned';
  const isMine = item.ownerId === currentUserId;
  const youSupervised = item.supervisorUserId === currentUserId && !isMine;
  const youObserved = item.observerUserId === currentUserId && !isMine;
  const relationTag = isMine ? null : youSupervised ? 'You supervised' : youObserved ? 'You observed' : null;
  const canApprove = item.supervisorUserId === currentUserId;
  const isApproved = !!item.approvedBy;

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.indicator, item.success ? styles.indicatorSuccess : styles.indicatorFail]} />
      <View style={styles.itemBody}>
        <Text style={styles.itemType}>{item.procedureType}</Text>
        <Text style={styles.itemMeta}>
          {formatDisplay(item.createdAt)} · {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{isMine ? 'You' : ownerName}</Text>
          {relationTag && (
            <View style={styles.relationPill}>
              <Text style={styles.relationPillText}>{relationTag}</Text>
            </View>
          )}
          {item.externalSupervisorName && (
            <View style={styles.externalPill}>
              <Text style={styles.externalPillText}>Off-system: {item.externalSupervisorName}</Text>
            </View>
          )}
          {isApproved && (
            <View style={styles.approvedPill}>
              <Text style={styles.approvedPillText}>Approved</Text>
            </View>
          )}
        </View>
        {item.complications ? <Text style={styles.itemComplications}>{item.complications}</Text> : null}

        {canApprove && !isApproved && (
          <TouchableOpacity
            style={styles.approveInline}
            onPress={() => onApprove(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
            <Text style={styles.approveInlineText}>Approve</Text>
          </TouchableOpacity>
        )}
        {canApprove && isApproved && (
          <TouchableOpacity
            style={styles.revokeInline}
            onPress={() => onRevoke(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={14} color={COLORS.warning} />
            <Text style={styles.revokeInlineText}>Revoke approval</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.badge, item.success ? styles.badgeSuccess : styles.badgeFail]}>
        <Text style={[styles.badgeText, item.success ? styles.badgeTextSuccess : styles.badgeTextFail]}>
          {item.success ? 'Success' : 'Fail'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function ProcedureListScreen({ navigation }: ProceduresStackProps<'ProcedureList'>) {
  const { procedures, isLoading, fetchProcedures, approveProcedure, revokeProcedureApproval } =
    useProcedureStore();
  const { userId } = useAuthStore();

  async function handleApprove(id: string) {
    try {
      await approveProcedure(id);
    } catch (e) {
      Alert.alert('Could not approve', e instanceof Error ? e.message : String(e));
    }
  }

  function handleRevoke(id: string) {
    Alert.alert('Revoke approval', 'Remove your approval from this procedure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await revokeProcedureApproval(id);
          } catch (e) {
            Alert.alert('Could not revoke', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }
  const [directory, setDirectory] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProcedures();
      getUserDirectory().then(setDirectory).catch(() => setDirectory({}));
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={procedures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProcedureItem
            item={item}
            directory={directory}
            currentUserId={userId}
            onPress={() => navigation.navigate('AddProcedure', {})}
            onApprove={handleApprove}
            onRevoke={handleRevoke}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={procedures.length === 0 ? { flex: 1 } : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="medkit-outline"
            title="No procedures yet"
            subtitle="Tap the + button to log a procedure"
          />
        }
        refreshing={isLoading}
        onRefresh={fetchProcedures}
        ListHeaderComponent={
          procedures.length > 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddProcedure', {})}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.addBtnText}>Log Procedure</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FAB */}
      {procedures.length === 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddProcedure', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: SPACING.xxl },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  addBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  indicator: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  indicatorSuccess: { backgroundColor: COLORS.success },
  indicatorFail: { backgroundColor: COLORS.error },
  itemBody: { flex: 1 },
  itemType: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  metaText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  relationPill: {
    backgroundColor: COLORS.accent + '18',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  relationPillText: { fontSize: 10, color: COLORS.accent, fontWeight: '700' },
  externalPill: {
    backgroundColor: COLORS.textMuted + '22',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  externalPillText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  approvedPill: {
    backgroundColor: COLORS.success + '22',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.xs,
  },
  approvedPillText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  approveInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
    marginTop: SPACING.xs,
  },
  approveInlineText: { fontSize: FONT_SIZE.xs, color: COLORS.white, fontWeight: '700' },
  revokeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
    marginTop: SPACING.xs,
  },
  revokeInlineText: { fontSize: FONT_SIZE.xs, color: COLORS.warning, fontWeight: '700' },
  itemComplications: { fontSize: FONT_SIZE.xs, color: COLORS.warning, marginTop: 2 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm },
  badgeSuccess: { backgroundColor: COLORS.successLight },
  badgeFail: { backgroundColor: COLORS.errorLight },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  badgeTextSuccess: { color: COLORS.success },
  badgeTextFail: { color: COLORS.error },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
