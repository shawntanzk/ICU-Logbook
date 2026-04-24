import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../utils/constants';

export interface SelectOption {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  label: string;
  options: SelectOption[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  /** Allow clearing the selection */
  clearable?: boolean;
  hint?: string;
}

export function SelectField({
  label, options, value, onChange,
  placeholder = 'Select…', error, required, clearable, hint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.id === value);
  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => { setSearch(''); setOpen(true); }}
        activeOpacity={0.75}
      >
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <View style={styles.triggerRight}>
          {clearable && selected ? (
            <TouchableOpacity
              onPress={() => onChange(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search…"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Options */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.id === value;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => { onChange(item.id); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                    {item.description ? (
                      <Text style={styles.optionDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.empty}>No matches for "{search}"</Text>
            }
            contentContainerStyle={{ paddingBottom: SPACING.xxl }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  required: { color: COLORS.error },
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: SPACING.xs },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  triggerError: { borderColor: COLORS.error },
  triggerText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  triggerPlaceholder: { color: COLORS.textMuted },
  triggerRight: { flexDirection: 'row', alignItems: 'center' },
  error: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  searchIcon: { marginRight: SPACING.xs },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm + 2,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    backgroundColor: COLORS.white,
  },
  optionSelected: { backgroundColor: '#EBF3FC' },
  optionContent: { flex: 1 },
  optionLabel: { fontSize: FONT_SIZE.md, color: COLORS.text },
  optionLabelSelected: { color: COLORS.primary, fontWeight: '600' },
  optionDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md },
  empty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
});
