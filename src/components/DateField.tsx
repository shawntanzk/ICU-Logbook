import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';

// Platform-aware date field. iOS spinner inside a modal (tappable
// cancel / done), Android uses the native dialog directly. Always
// normalises to YYYY-MM-DD strings so the rest of the app can stay
// string-typed without wrestling with Date objects.

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parse(iso: string): Date {
  if (!iso) return new Date();
  // Parse as local, not UTC — picker shows local date.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  maxDate?: Date;
  minDate?: Date;
  disabled?: boolean;
}

export function DateField({ value, onChange, label, maxDate, minDate, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const current = value ? parse(value) : new Date();

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      // Android dismisses itself on any selection / cancel.
      setOpen(false);
      if (selected) onChange(fmt(selected));
      return;
    }
    // iOS: keep modal open; commit on Done.
    if (selected) onChange(fmt(selected));
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} ${value || 'not set'}` : `Date ${value || 'not set'}`}
      >
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || 'Select date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.sheetAction}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={current}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              minimumDate={minDate}
              onChange={handleChange}
            />
          </View>
        </Modal>
      ) : (
        open && (
          <DateTimePicker
            value={current}
            mode="date"
            display="default"
            maximumDate={maxDate}
            minimumDate={minDate}
            onChange={handleChange}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    minHeight: 48,
  },
  fieldDisabled: { opacity: 0.5 },
  value: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },
  placeholder: { color: COLORS.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: COLORS.white, paddingBottom: SPACING.lg },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetAction: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },
});
