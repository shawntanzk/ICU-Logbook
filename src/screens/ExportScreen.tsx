import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import { exportAll, ExportFormat } from '../services/export';

interface FormatDef {
  id: ExportFormat;
  title: string;
  summary: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const FORMATS: FormatDef[] = [
  {
    id: 'fhir',
    title: 'HL7 FHIR R4 Bundle',
    summary: 'Standards-based healthcare interchange. Each case → Encounter + Condition + Observations.',
    icon: 'medical-outline',
  },
  {
    id: 'openehr',
    title: 'openEHR Composition',
    summary: 'Structured clinical data for EU-aligned research repositories.',
    icon: 'layers-outline',
  },
  {
    id: 'jsonld',
    title: 'JSON-LD (semantic)',
    summary: 'Linked-data export with a published @context. Parseable as RDF.',
    icon: 'git-network-outline',
  },
  {
    id: 'dictionary',
    title: 'Data dictionary',
    summary: 'Human-readable codebook describing every field and its terminology binding.',
    icon: 'book-outline',
  },
];

export function ExportScreen() {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function run(format: ExportFormat) {
    setBusy(format);
    try {
      const bundle = await exportAll(format);
      // React Native's Share API accepts string payloads on both platforms.
      // For the JSON formats we share the payload directly; receiving apps
      // (Files, Mail, etc.) will save with the correct extension.
      await Share.share({
        message: bundle.payload,
        title: bundle.filename,
      });
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Export your data</Text>
        <Text style={styles.body}>
          Exports include every record whose consent is set to "anonymous", "research", or
          "commercial". Free-text fields are scrubbed for personally-identifiable patterns,
          dates are shifted to epoch-week, and the device ID is redacted. Every payload is
          self-describing via its schema version and data dictionary.
        </Text>

        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.card}
            onPress={() => run(f.id)}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            <Ionicons name={f.icon} size={28} color={COLORS.primary} style={styles.icon} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardSummary}>{f.summary}</Text>
            </View>
            <Ionicons
              name={busy === f.id ? 'hourglass-outline' : 'share-outline'}
              size={22}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  heading: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  body: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 20, marginBottom: SPACING.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: { marginRight: SPACING.md },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  cardSummary: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 17 },
});
