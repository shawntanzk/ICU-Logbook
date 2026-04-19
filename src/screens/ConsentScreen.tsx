import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { Button } from '../components/Button';
import { useConsentStore } from '../store/consentStore';
import { ConsentStatus } from '../models/Provenance';

interface Option {
  value: ConsentStatus;
  title: string;
  summary: string;
}

const OPTIONS: Option[] = [
  {
    value: 'anonymous',
    title: 'Anonymous analytics only',
    summary:
      'My records may be included in fully-anonymised, aggregated statistics (e.g. national case-volume benchmarks). No individual record is ever released.',
  },
  {
    value: 'research',
    title: 'Anonymised research use',
    summary:
      'In addition to the above, fully-anonymised individual records may be shared with academic or training-body research partners under a non-commercial licence.',
  },
  {
    value: 'commercial',
    title: 'Anonymised commercial datasets',
    summary:
      'In addition to the above, fully-anonymised individual records may be included in commercial data products (e.g. sold to research organisations). Still zero identifying information — we never collect names, MRNs, or dates-of-birth.',
  },
  {
    value: 'none',
    title: 'Keep my records private',
    summary: 'My records stay on this device only. They are never exported or synced.',
  },
];

export function ConsentScreen() {
  const { status, setStatus } = useConsentStore();
  const [pending, setPending] = useState<ConsentStatus>(status);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setStatus(pending);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Data sharing</Text>
        <Text style={styles.body}>
          This logbook never collects patient-identifying data. You can choose how your
          fully-anonymised case summaries are used. You can change this at any time from Settings.
        </Text>

        {OPTIONS.map((opt) => {
          const selected = pending === opt.value;
          return (
            <View
              key={opt.value}
              style={[styles.card, selected && styles.cardSelected]}
              onStartShouldSetResponder={() => {
                setPending(opt.value);
                return true;
              }}
            >
              <View style={styles.row}>
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={styles.cardTitle}>{opt.title}</Text>
              </View>
              <Text style={styles.cardSummary}>{opt.summary}</Text>
            </View>
          );
        })}

        <Button
          label={status === 'none' && !useConsentStore.getState().hasChosen ? 'Save and continue' : 'Save'}
          onPress={save}
          loading={saving}
          style={styles.save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  heading: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  body: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  radioSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, flex: 1 },
  cardSummary: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 19, marginLeft: 28 },
  save: { marginTop: SPACING.lg },
});
