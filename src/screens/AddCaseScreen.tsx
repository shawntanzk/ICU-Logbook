import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useCaseStore } from '../store/caseStore';
import { CaseLogSchema, CaseLogInput } from '../models/CaseLog';
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
  COLORS, SPACING, FONT_SIZE, RADIUS,
  ORGAN_SYSTEMS, COBATRICE_DOMAINS, SUPERVISION_LEVELS,
  SEX_OPTIONS, LEVEL_OF_CARE_OPTIONS, INVOLVEMENT_OPTIONS,
  OUTCOME_OPTIONS, TEACHING_RECIPIENT_OPTIONS, SPECIALTY_OPTIONS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';

type FieldErrors = Partial<Record<keyof CaseLogInput, string>>;

const EMPTY_FORM: CaseLogInput = {
  date: todayISO(),
  // demographics
  patientAge: '',
  patientSex: undefined,
  // classification
  caseNumber: '',
  primarySpecialty: undefined,
  levelOfCare: undefined,
  admitted: undefined,
  cardiacArrest: false,
  involvement: undefined,
  reviewedAgain: false,
  // diagnosis
  diagnosis: '',
  icd10Code: '',
  organSystems: [],
  cobatriceDomains: [],
  // outcome
  outcome: undefined,
  communicatedWithRelatives: false,
  // teaching
  teachingDelivered: false,
  teachingRecipient: undefined,
  // supervision
  supervisionLevel: 'local',
  supervisorUserId: null,
  observerUserId: null,
  externalSupervisorName: null,
  notes: '',
  reflection: '',
};

export function AddCaseScreen() {
  const { addCase } = useCaseStore();
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<CaseLogInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof CaseLogInput>(key: K, value: CaseLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await addCase(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO() });
      setErrors({});
      Alert.alert('Case Logged', 'Your case has been saved successfully.');
    } catch {
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
          {/* ── Date ─────────────────────────────────────────────────── */}
          <DateField
            label="Date"
            value={form.date}
            onChange={(v) => update('date', v)}
            maxDate={new Date()}
          />
          {errors.date ? <Text style={styles.inlineError}>{errors.date}</Text> : null}

          {/* ── Patient demographics ──────────────────────────────────── */}
          <SectionLabel title="Patient Demographics" />
          <FormField
            label="Age"
            placeholder="e.g. 45  or  2/12  or  1/52"
            value={form.patientAge ?? ''}
            onChangeText={(v) => update('patientAge', v || '')}
            hint="Years as a number, months as n/12, weeks as n/52"
            error={errors.patientAge}
            keyboardType="default"
          />
          <SelectField
            label="Sex"
            options={SEX_OPTIONS}
            value={form.patientSex ?? null}
            onChange={(v) => update('patientSex', (v as CaseLogInput['patientSex']) ?? undefined)}
            clearable
          />

          {/* ── Episode classification ────────────────────────────────── */}
          <SectionLabel title="Episode Classification" />
          <FormField
            label="Case / Episode Number"
            placeholder="Optional reference number"
            value={form.caseNumber ?? ''}
            onChangeText={(v) => update('caseNumber', v || '')}
          />
          <SelectField
            label="Primary Specialty"
            options={SPECIALTY_OPTIONS}
            value={form.primarySpecialty ?? null}
            onChange={(v) => update('primarySpecialty', (v as CaseLogInput['primarySpecialty']) ?? undefined)}
            clearable
            placeholder="Select specialty…"
          />
          <SelectField
            label="Level of Care"
            options={LEVEL_OF_CARE_OPTIONS}
            value={form.levelOfCare ?? null}
            onChange={(v) => update('levelOfCare', (v as CaseLogInput['levelOfCare']) ?? undefined)}
            clearable
          />
          <RadioGroup
            label="Involvement"
            options={INVOLVEMENT_OPTIONS}
            value={form.involvement ?? ''}
            onChange={(v) => update('involvement', v as CaseLogInput['involvement'])}
          />
          <ToggleField
            label="Patient Admitted to ICU/HDU"
            value={form.admitted ?? false}
            onChange={(v) => update('admitted', v)}
          />
          <ToggleField
            label="Cardiac Arrest"
            value={form.cardiacArrest ?? false}
            onChange={(v) => update('cardiacArrest', v)}
          />
          <ToggleField
            label="Reviewed Again (follow-up shift)"
            value={form.reviewedAgain ?? false}
            onChange={(v) => update('reviewedAgain', v)}
          />

          {/* ── Diagnosis ────────────────────────────────────────────── */}
          <SectionLabel title="Diagnosis" />
          <FormField
            label="Primary Diagnosis"
            required
            placeholder="e.g. Septic shock secondary to pneumonia"
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
          <MultiSelect
            label="Organ Systems Involved"
            required
            options={ORGAN_SYSTEMS}
            selected={form.organSystems}
            onChange={(v) => update('organSystems', v)}
            error={errors.organSystems}
          />
          <MultiSelect
            label="CoBaTrICE Domains"
            required
            options={COBATRICE_DOMAINS}
            selected={form.cobatriceDomains}
            onChange={(v) => update('cobatriceDomains', v)}
            error={errors.cobatriceDomains}
          />

          {/* ── Teaching ─────────────────────────────────────────────── */}
          <SectionLabel title="Teaching" />
          <ToggleField
            label="Teaching Delivered"
            value={form.teachingDelivered ?? false}
            onChange={(v) => {
              update('teachingDelivered', v);
              if (!v) update('teachingRecipient', undefined);
            }}
          />
          {form.teachingDelivered && (
            <SelectField
              label="Teaching Recipient"
              options={TEACHING_RECIPIENT_OPTIONS}
              value={form.teachingRecipient ?? null}
              onChange={(v) => update('teachingRecipient', (v as CaseLogInput['teachingRecipient']) ?? undefined)}
              clearable
            />
          )}

          {/* ── Supervision ──────────────────────────────────────────── */}
          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as CaseLogInput['supervisionLevel'])}
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
            hint="Cases with an off-system supervisor cannot be approved."
            autoCapitalize="words"
          />
          <UserPicker
            label="Observed by"
            users={otherUsers}
            value={form.observerUserId ?? null}
            onChange={(v) => update('observerUserId', v)}
            placeholder="None"
          />

          {/* ── Outcome ──────────────────────────────────────────────── */}
          <SectionLabel title="Outcome" />
          <SelectField
            label="Patient Outcome"
            options={OUTCOME_OPTIONS}
            value={form.outcome ?? null}
            onChange={(v) => update('outcome', (v as CaseLogInput['outcome']) ?? undefined)}
            clearable
            placeholder="Select outcome…"
          />
          <ToggleField
            label="Communication with Relatives"
            value={form.communicatedWithRelatives ?? false}
            onChange={(v) => update('communicatedWithRelatives', v)}
          />

          {/* ── Notes ────────────────────────────────────────────────── */}
          <SectionLabel title="Notes / Remarks" />
          <FormField
            label="Notes / Remarks"
            placeholder="Any additional notes or remarks…"
            value={form.notes ?? ''}
            onChangeText={(v) => update('notes', v)}
            multiline
            numberOfLines={3}
            style={styles.textarea}
            textAlignVertical="top"
          />

          {/* ── Reflection ───────────────────────────────────────────── */}
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

          <Button label="Save Case" onPress={handleSubmit} loading={loading} style={styles.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.text}>{title}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  text: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  textarea: { minHeight: 100 },
  submit: { marginTop: SPACING.sm },
  inlineError: {
    color: COLORS.error,
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
});
