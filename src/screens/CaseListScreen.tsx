import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCaseStore } from '../store/caseStore';
import { CaseLog } from '../models/CaseLog';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SUPERVISION_LEVELS } from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import type { CasesStackProps } from '../navigation/types';

const SUPERVISION_BADGE: Record<string, string> = {
  observed: 'OBS',
  supervised: 'SUP',
  unsupervised: 'UNS',
};

const SUPERVISION_COLOR: Record<string, string> = {
  observed: COLORS.success,
  supervised: COLORS.warning,
  unsupervised: COLORS.error,
};

function CaseItem({ item, onPress }: { item: CaseLog; onPress: () => void }) {
  const badge = SUPERVISION_BADGE[item.supervisionLevel] ?? '?';
  const badgeColor = SUPERVISION_COLOR[item.supervisionLevel] ?? COLORS.textMuted;

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemDate}>{formatDisplay(item.date)}</Text>
        <Text style={styles.itemDiagnosis} numberOfLines={2}>{item.diagnosis}</Text>
        <Text style={styles.itemDomains}>
          {item.cobatriceDomains.length} domain{item.cobatriceDomains.length !== 1 ? 's' : ''} ·{' '}
          {item.organSystems.length} system{item.organSystems.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.border} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

export function CaseListScreen({ navigation }: CasesStackProps<'CaseList'>) {
  const { cases, fetchCases, isLoading } = useCaseStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchCases);
    return unsubscribe;
  }, [navigation]);

  const filtered = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) =>
        c.diagnosis.toLowerCase().includes(q) ||
        c.icd10Code?.toLowerCase().includes(q) ||
        c.date.includes(q)
    );
  }, [cases, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by diagnosis, date..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaseItem item={item} onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={search ? 'No matches found' : 'No cases yet'}
            subtitle={search ? 'Try a different search term' : 'Tap "Add Case" to log your first case'}
          />
        }
        refreshing={isLoading}
        onRefresh={fetchCases}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.xs },
  searchInput: { flex: 1, height: 44, fontSize: FONT_SIZE.md, color: COLORS.text },
  listContent: { paddingBottom: SPACING.xxl },
  emptyContainer: { flex: 1 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  itemLeft: { flex: 1 },
  itemDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 2 },
  itemDiagnosis: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600', marginBottom: 4 },
  itemDomains: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  itemRight: { alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.sm },
  badge: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  chevron: { marginTop: 4 },
});
