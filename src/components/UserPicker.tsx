import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { ManagedUser } from '../services/AuthService';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  label: string;
  users: ManagedUser[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

// Single-select picker for a user. `null` = "no one selected" — we
// surface a "None" row at the top so the field can be cleared.
export function UserPicker({ label, users, value, onChange, placeholder = 'Select…' }: Props) {
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value) ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.fieldText, !selected && styles.fieldPlaceholder]}>
          {selected ? selected.displayName : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            <Row
              label="None"
              selected={value === null}
              onPress={() => { onChange(null); setOpen(false); }}
            />
            {users.length === 0 ? (
              <Text style={styles.empty}>No other users available. Ask an admin to add some.</Text>
            ) : (
              users.map((u) => (
                <Row
                  key={u.id}
                  label={u.displayName}
                  sub={u.email}
                  selected={value === u.id}
                  onPress={() => { onChange(u.id); setOpen(false); }}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Row({
  label, sub, selected, onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.row, selected && styles.rowSelected]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {selected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    minHeight: 48,
  },
  fieldText: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  fieldPlaceholder: { color: COLORS.textMuted },

  modalSafe: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  modalDone: { fontSize: FONT_SIZE.md, color: COLORS.primary, fontWeight: '700' },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  rowLabel: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '500' },
  rowLabelSelected: { color: COLORS.primary, fontWeight: '700' },
  rowSub: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  empty: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', padding: SPACING.lg },
});
