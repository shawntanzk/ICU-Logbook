import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaseStore } from '../store/caseStore';
import { CaseLogSchema, CaseLogInput } from '../models/CaseLog';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { MultiSelect } from '../components/MultiSelect';
import { RadioGroup } from '../components/RadioGroup';
import { Button } from '../components/Button';
import { ICD10Autocomplete } from '../components/ICD10Autocomplete';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import {
  COLORS,
  FONT_SIZE,
  SPACING,
  ORGAN_SYSTEMS,
  COBATRICE_DOMAINS,
  SUPERVISION_LEVELS,
} from '../utils/constants';
import type { CasesStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof CaseLogInput, string>>;

// Edit-mode counterpart to AddCaseScreen. Visibility is gated by the
// caller (CaseDetailScreen) — only the owner or an admin sees the entry
// point. The screen itself trusts that gate.
export function EditCaseScreen({ route, navigation }: CasesStackProps<'EditCase'>) {
  const { caseId } = route.params;
  const { cases, updateCase } = useCaseStore();
  const { userId, role } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const existing = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<CaseLogInput | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      date: existing.date,
      diagnosis: existing.diagnosis,
      icd10Code: existing.icd10Code ?? '',
      organSystems: existing.organSystems,
      cobatriceDomains: existing.cobatriceDomains,
      supervisionLevel: existing.supervisionLevel,
      supervisorUserId: existing.supervisorUserId ?? null,
      observerUserId: existing.observerUserId ?? null,
      externalSupervisorName: existing.externalSupervisorName ?? null,
      reflection: existing.reflection ?? '',
    });
  }, [existing]);

  if (!existing || !form) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Case not found.</Text>
      </SafeAreaView>
    );
  }

  const canEdit = existing.ownerId === userId || role === 'admin';
  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>You can only edit cases you logged.</Text>
      </SafeAreaView>
    );
  }

  function update<K extends keyof CaseLogInput>(key: K, value: CaseLogInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    if (!form) return;
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
      await updateCase(caseId, result.data);
      Alert.alert('Saved', 'Your case has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save.');
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
          <DateField
            label="Date"
            value={form.date}
            onChange={(v) => update('date', v)}
            maxDate={new Date()}
          />
          {errors.date ? <Text style={editStyles.inlineError}>{errors.date}</Text> : null}
          <FormField label="Primary Diagnosis" required
            value={form.diagnosis} onChangeText={(v) => update('diagnosis', v)} error={errors.diagnosis}
            autoCapitalize="sentences"
          />
          <ICD10Autocomplete label="ICD-10 Code" value={form.icd10Code ?? ''}
            onChange={(v) => update('icd10Code', v)} error={errors.icd10Code}
            hint="Start typing a diagnosis or code"
          />
          <MultiSelect label="Organ Systems Involved" required options={ORGAN_SYSTEMS}
            selected={form.organSystems} onChange={(v) => update('organSystems', v)} error={errors.organSystems}
          />
          <MultiSelect label="CoBaTrICE Domains" required options={COBATRICE_DOMAINS}
            selected={form.cobatriceDomains} onChange={(v) => update('cobatriceDomains', v)} error={errors.cobatriceDomains}
          />
          <RadioGroup label="Supervision Level" required options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as CaseLogInput['supervisionLevel'])}
            error={errors.supervisionLevel}
          />
          <UserPicker label="Supervised by" users={otherUsers}
            value={form.supervisorUserId ?? null}
            onChange={(v) => {
              update('supervisorUserId', v);
              if (v) update('externalSupervisorName', null);
            }}
            placeholder="None"
          />
          <FormField label="Supervisor not on system"
            placeholder="Type a name (optional)"
            value={form.externalSupervisorName ?? ''}
            onChangeText={(v) => {
              const trimmed = v || null;
              update('externalSupervisorName', trimmed);
              if (trimmed) update('supervisorUserId', null);
            }}
            hint="Changing supervisors clears any prior approval."
            autoCapitalize="words"
          />
          <UserPicker label="Observed by" users={otherUsers}
            value={form.observerUserId ?? null}
            onChange={(v) => update('observerUserId', v)}
            placeholder="None"
          />
          <FormField label="Reflection" value={form.reflection ?? ''}
            onChangeText={(v) => update('reflection', v)} error={errors.reflection}
            multiline numberOfLines={4} style={styles.textarea} textAlignVertical="top"
          />
          <Button label="Save Changes" onPress={handleSubmit} loading={loading} style={styles.submit} />
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
  notFound: { textAlign: 'center', marginTop: SPACING.xxl, color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
});

const editStyles = StyleSheet.create({
  inlineError: { color: COLORS.error, fontSize: 12, marginTop: 4, marginBottom: SPACING.sm },
});
