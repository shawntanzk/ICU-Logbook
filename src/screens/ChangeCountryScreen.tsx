import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SelectField } from '../components/SelectField';
import { COUNTRY_OPTIONS } from '../data/countries';
import { useAuthStore } from '../store/authStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../utils/constants';
import type { SettingsStackParamList } from '../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ChangeCountry'>;

export function ChangeCountryScreen({ navigation }: Props) {
  const { country: currentCountry, updateCountry } = useAuthStore();
  const [selected, setSelected] = useState<string | null>(currentCountry ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError('');
    if (!selected) {
      setError('Please select a country.');
      return;
    }
    if (selected === currentCountry) {
      navigation.goBack();
      return;
    }
    setBusy(true);
    try {
      const result = await updateCountry(selected);
      if (!result.ok) {
        setError(result.error ?? 'Could not update country.');
        return;
      }
      Alert.alert(
        'Country updated',
        'Your country has been changed. This change is recorded — your previous entries remain associated with your prior country.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Country of practice"
          required
          options={COUNTRY_OPTIONS}
          value={selected}
          onChange={(v) => { setSelected(v); setError(''); }}
          placeholder="Select your country…"
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            Country changes are recorded with a timestamp. All existing log entries remain associated with the country you had at the time of logging.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, busy && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="globe-outline" size={18} color={COLORS.white} />
              <Text style={styles.btnText}>Save Country</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.error, marginBottom: SPACING.md },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  btnText: { fontSize: FONT_SIZE.md, color: COLORS.white, fontWeight: '700' },
});
