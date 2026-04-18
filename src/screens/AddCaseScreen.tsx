import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaseStore } from '../store/caseStore';
import { CaseLogSchema, CaseLogInput } from '../models/CaseLog';
import { FormField } from '../components/FormField';
import { MultiSelect } from '../components/MultiSelect';
import { RadioGroup } from '../components/RadioGroup';
import { Button } from '../components/Button';
import {
  COLORS,
  SPACING,
  ORGAN_SYSTEMS,
  COBATRICE_DOMAINS,
  SUPERVISION_LEVELS,
  FONT_SIZE,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';

type FieldErrors = Partial<Record<keyof CaseLogInput, string>>;

const EMPTY_FORM: CaseLogInput = {
  date: todayISO(),
  diagnosis: '',
  icd10Code: '',
  organSystems: [],
  cobatriceDomains: [],
  supervisionLevel: 'supervised',
  reflection: '',
};

export function AddCaseScreen() {
  const { addCase } = useCaseStore();
  const { role } = useAuthStore();

  // Supervisors have read-only access — show a locked state
  if (role === 'supervisor') {
    return (
      <View style={styles.supervisorLock}>
        <Ionicons name="lock-closed" size={48} color={COLORS.border} />
        <Text style={styles.supervisorLockTitle}>Supervisor View</Text>
        <Text style={styles.supervisorLockSub}>
          Supervisors cannot log cases.{'\n'}Switch to a Trainee account to add entries.
        </Text>
      </View>
    );
  }
  const [form, setForm] = useState<CaseLogInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof CaseLogInput>(key: K, value: CaseLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const result = CaseLogSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CaseLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await addCase(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO() });
      setErrors({});
      Alert.alert('Case Logged', 'Your case has been saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save case. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <FormField
            label="Date"
            required
            placeholder="YYYY-MM-DD"
            value={form.date}
            onChangeText={(v) => update('date', v)}
            error={errors.date}
            hint="Format: YYYY-MM-DD (e.g. 2026-04-17)"
            keyboardType="numbers-and-punctuation"
          />

          {/* Diagnosis */}
          <FormField
            label="Primary Diagnosis"
            required
            placeholder="e.g. Septic shock secondary to pneumonia"
            value={form.diagnosis}
            onChangeText={(v) => update('diagnosis', v)}
            error={errors.diagnosis}
            autoCapitalize="sentences"
          />

          {/* ICD-10 */}
          <FormField
            label="ICD-10 Code"
            placeholder="e.g. A41.9"
            value={form.icd10Code ?? ''}
            onChangeText={(v) => update('icd10Code', v)}
            error={errors.icd10Code}
            autoCapitalize="characters"
          />

          {/* Organ Systems */}
          <MultiSelect
            label="Organ Systems Involved"
            required
            options={ORGAN_SYSTEMS}
            selected={form.organSystems}
            onChange={(v) => update('organSystems', v)}
            error={errors.organSystems}
          />

          {/* CoBaTrICE Domains */}
          <MultiSelect
            label="CoBaTrICE Domains"
            required
            options={COBATRICE_DOMAINS}
            selected={form.cobatriceDomains}
            onChange={(v) => update('cobatriceDomains', v)}
            error={errors.cobatriceDomains}
          />

          {/* Supervision Level */}
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as CaseLogInput['supervisionLevel'])}
            error={errors.supervisionLevel}
          />

          {/* Reflection */}
          <FormField
            label="Reflection"
            placeholder="What did you learn? What would you do differently?"
            value={form.reflection ?? ''}
            onChangeText={(v) => update('reflection', v)}
            error={errors.reflection}
            multiline
            numberOfLines={4}
            style={styles.textarea}
            textAlignVertical="top"
          />

          <Button label="Save Case" onPress={handleSubmit} loading={loading} style={styles.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  textarea: { minHeight: 100 },
  submit: { marginTop: SPACING.sm },
  supervisorLock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  supervisorLockTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  supervisorLockSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
