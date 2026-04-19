import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaseStore } from '../store/caseStore';
import { CaseLogSchema, CaseLogInput } from '../models/CaseLog';
import { FormField } from '../components/FormField';
import { MultiSelect } from '../components/MultiSelect';
import { RadioGroup } from '../components/RadioGroup';
import { Button } from '../components/Button';
import { ICD10Autocomplete } from '../components/ICD10Autocomplete';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import {
  COLORS,
  SPACING,
  ORGAN_SYSTEMS,
  COBATRICE_DOMAINS,
  SUPERVISION_LEVELS,
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
  supervisorUserId: null,
  observerUserId: null,
  externalSupervisorName: null,
  reflection: '',
};

export function AddCaseScreen() {
  const { addCase } = useCaseStore();
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Don't offer the current user as their own supervisor/observer.
  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

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

          {/* ICD-10 — autocomplete shows "<label> [CODE]", saves code only */}
          <ICD10Autocomplete
            label="ICD-10 Code"
            value={form.icd10Code ?? ''}
            onChange={(v) => update('icd10Code', v)}
            error={errors.icd10Code}
            hint="Start typing a diagnosis or code"
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

          {/* Supervised by — visible to chosen user as well as the owner */}
          <UserPicker
            label="Supervised by"
            users={otherUsers}
            value={form.supervisorUserId ?? null}
            onChange={(v) => {
              update('supervisorUserId', v);
              if (v) update('externalSupervisorName', null);
            }}
            placeholder="None"
          />

          {/* External supervisor name — for supervisors who don't have
              an account. Mutually exclusive with the picker above. */}
          <FormField
            label="Supervisor not on system"
            placeholder="Type a name (optional)"
            value={form.externalSupervisorName ?? ''}
            onChangeText={(v) => {
              const trimmed = v || null;
              update('externalSupervisorName', trimmed);
              if (trimmed) update('supervisorUserId', null);
            }}
            hint="Use only when the supervisor has no account. Cases with an off-system supervisor cannot be approved."
            autoCapitalize="words"
          />

          {/* Observed by — same visibility rules as supervisor */}
          <UserPicker
            label="Observed by"
            users={otherUsers}
            value={form.observerUserId ?? null}
            onChange={(v) => update('observerUserId', v)}
            placeholder="None"
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
});
