import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { WardReviewLogInput, WardReviewLogSchema } from '../models/WardReviewLog';
import { WardReviewService } from '../services/WardReviewService';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { MultiSelect } from '../components/MultiSelect';
import { RadioGroup } from '../components/RadioGroup';
import { SelectField } from '../components/SelectField';
import { ToggleField } from '../components/ToggleField';
import { Button } from '../components/Button';
import { ICD10Autocomplete } from '../components/ICD10Autocomplete';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import {
  COLORS, SPACING, FONT_SIZE,
  COBATRICE_DOMAINS, SUPERVISION_LEVELS,
  SEX_OPTIONS, SPECIALTY_OPTIONS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';
import type { LogStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof WardReviewLogInput, string>>;

const REVIEW_OUTCOME_OPTIONS = [
  { id: 'escalated_icu', label: 'Escalated to ICU' },
  { id: 'escalated_hdu', label: 'Escalated to HDU' },
  { id: 'not_escalated', label: 'Not escalated — optimised on ward' },
  { id: 'advice_only', label: 'Advice given only' },
  { id: 'other', label: 'Other' },
];

const EMPTY_FORM: WardReviewLogInput = {
  date: todayISO(),
  patientAge: '',
  patientSex: undefined,
  referringSpecialty: undefined,
  diagnosis: '',
  icd10Code: '',
  reviewOutcome: 'advice_only',
  communicatedWithRelatives: false,
  cobatriceDomains: [],
  supervisionLevel: 'local',
  supervisorUserId: null,
  externalSupervisorName: null,
  reflection: '',
};

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 8, marginTop: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
    </View>
  );
}

export function AddWardReviewScreen(_props: LogStackProps<'AddWardReview'>) {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<WardReviewLogInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof WardReviewLogInput>(key: K, value: WardReviewLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const result = WardReviewLogSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof WardReviewLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await WardReviewService.create(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO() });
      setErrors({});
      Alert.alert('Ward Review Logged', 'Your ward review has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save ward review. Please try again.');
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

          <SectionLabel title="Patient" />
          <FormField
            label="Age"
            placeholder="e.g. 45  or  2/12  or  1/52"
            value={form.patientAge ?? ''}
            onChangeText={(v) => update('patientAge', v || '')}
            hint="Years, months as n/12, weeks as n/52"
            error={errors.patientAge}
          />
          <SelectField
            label="Sex"
            options={SEX_OPTIONS}
            value={form.patientSex ?? null}
            onChange={(v) => update('patientSex', (v as WardReviewLogInput['patientSex']) ?? undefined)}
            clearable
          />

          <SectionLabel title="Referral" />
          <SelectField
            label="Referring Specialty"
            options={SPECIALTY_OPTIONS}
            value={form.referringSpecialty ?? null}
            onChange={(v) => update('referringSpecialty', (v as WardReviewLogInput['referringSpecialty']) ?? undefined)}
            clearable
            placeholder="Select referring specialty…"
          />

          <SectionLabel title="Diagnosis" />
          <FormField
            label="Diagnosis"
            required
            value={form.diagnosis}
            onChangeText={(v) => update('diagnosis', v)}
            error={errors.diagnosis}
            autoCapitalize="sentences"
          />
          <ICD10Autocomplete
            label="ICD-10 Code"
            value={form.icd10Code ?? ''}
            onChange={(v) => update('icd10Code', v)}
            error={errors.icd10Code}
            hint="Start typing a diagnosis or code"
          />

          <SectionLabel title="Review Outcome" />
          <RadioGroup
            label="Review Outcome"
            options={REVIEW_OUTCOME_OPTIONS}
            value={form.reviewOutcome ?? ''}
            onChange={(v) => update('reviewOutcome', v as WardReviewLogInput['reviewOutcome'])}
            error={errors.reviewOutcome}
          />
          <ToggleField
            label="Communication with Relatives"
            value={form.communicatedWithRelatives ?? false}
            onChange={(v) => update('communicatedWithRelatives', v)}
          />

          <SectionLabel title="CoBaTrICE Domains" />
          <MultiSelect
            label="CoBaTrICE Domains"
            options={COBATRICE_DOMAINS}
            selected={form.cobatriceDomains ?? []}
            onChange={(v) => update('cobatriceDomains', v)}
            error={errors.cobatriceDomains}
          />

          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as WardReviewLogInput['supervisionLevel'])}
            error={errors.supervisionLevel}
          />
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
          <FormField
            label="Supervisor not on system"
            placeholder="Type a name (optional)"
            value={form.externalSupervisorName ?? ''}
            onChangeText={(v) => {
              const trimmed = v || null;
              update('externalSupervisorName', trimmed);
              if (trimmed) update('supervisorUserId', null);
            }}
            autoCapitalize="words"
          />

          <SectionLabel title="Reflection" />
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

          <Button label="Save Ward Review" onPress={handleSubmit} loading={loading} style={styles.submit} />
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
