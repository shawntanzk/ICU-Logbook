import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProcedureStore } from '../store/procedureStore';
import { ProcedureLog } from '../models/ProcedureLog';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import type { ProceduresStackProps } from '../navigation/types';

function ProcedureItem({ item, onPress }: { item: ProcedureLog; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.indicator, item.success ? styles.indicatorSuccess : styles.indicatorFail]} />
      <View style={styles.itemBody}>
        <Text style={styles.itemType}>{item.procedureType}</Text>
        <Text style={styles.itemMeta}>
          {formatDisplay(item.createdAt)} · {item.attempts} attempt{item.attempts !== 1 ? 's' : ''}
        </Text>
        {item.complications ? <Text style={styles.itemComplications}>{item.complications}</Text> : null}
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
  const { procedures, isLoading, fetchProcedures } = useProcedureStore();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchProcedures);
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
            onPress={() => navigation.navigate('AddProcedure', {})}
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
