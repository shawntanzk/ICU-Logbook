import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { TransferLogInput, TransferLogSchema } from '../models/TransferLog';
import { TransferService } from '../services/TransferService';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { RadioGroup } from '../components/RadioGroup';
import { SelectField } from '../components/SelectField';
import { ToggleField } from '../components/ToggleField';
import { Button } from '../components/Button';
import { ICD10Autocomplete } from '../components/ICD10Autocomplete';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import {
  COLORS, SPACING, FONT_SIZE,
  SUPERVISION_LEVELS,
  SEX_OPTIONS, LEVEL_OF_CARE_OPTIONS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';

type FieldErrors = Partial<Record<keyof TransferLogInput, string>>;

const TRANSFER_TYPE_OPTIONS = [
  { id: 'inter_hospital', label: 'Inter-hospital' },
  { id: 'intra_hospital', label: 'Intra-hospital' },
];

const TRANSFER_MODE_OPTIONS = [
  { id: 'land_ambulance', label: 'Land Ambulance' },
  { id: 'air_helicopter', label: 'Air — Helicopter' },
  { id: 'air_fixed_wing', label: 'Air — Fixed Wing' },
  { id: 'other', label: 'Other' },
];

const EMPTY_FORM: TransferLogInput = {
  date: todayISO(),
  patientAge: '',
  patientSex: undefined,
  diagnosis: '',
  icd10Code: '',
  transferType: 'inter_hospital',
  transferMode: 'land_ambulance',
  fromLocation: '',
  toLocation: '',
  levelOfCare: undefined,
  communicatedWithRelatives: false,
  proceduresDuringTransfer: [],
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

export function AddTransferScreen() {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<TransferLogInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof TransferLogInput>(key: K, value: TransferLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const result = TransferLogSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof TransferLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await TransferService.create(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO() });
      setErrors({});
      Alert.alert('Transfer Logged', 'Your transfer has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save transfer. Please try again.');
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
            error={errors.patientAge}
          />
          <SelectField
            label="Sex"
            options={SEX_OPTIONS}
            value={form.patientSex ?? null}
            onChange={(v) => update('patientSex', (v as TransferLogInput['patientSex']) ?? undefined)}
            clearable
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

          <SectionLabel title="Transfer Details" />
          <RadioGroup
            label="Transfer Type"
            options={TRANSFER_TYPE_OPTIONS}
            value={form.transferType ?? ''}
            onChange={(v) => update('transferType', v as TransferLogInput['transferType'])}
            error={errors.transferType}
          />
          <RadioGroup
            label="Transfer Mode"
            options={TRANSFER_MODE_OPTIONS}
            value={form.transferMode ?? ''}
            onChange={(v) => update('transferMode', v as TransferLogInput['transferMode'])}
            error={errors.transferMode}
          />
          <FormField
            label="From (hospital/ward)"
            placeholder="e.g. Royal Infirmary ICU"
            value={form.fromLocation ?? ''}
            onChangeText={(v) => update('fromLocation', v)}
            error={errors.fromLocation}
          />
          <FormField
            label="To (hospital/ward)"
            placeholder="e.g. Regional Neuro Centre ICU"
            value={form.toLocation ?? ''}
            onChangeText={(v) => update('toLocation', v)}
            error={errors.toLocation}
          />
          <SelectField
            label="Level of Care"
            options={LEVEL_OF_CARE_OPTIONS}
            value={form.levelOfCare ?? null}
            onChange={(v) => update('levelOfCare', (v as TransferLogInput['levelOfCare']) ?? undefined)}
            clearable
          />
          <ToggleField
            label="Communication with Relatives"
            value={form.communicatedWithRelatives ?? false}
            onChange={(v) => update('communicatedWithRelatives', v)}
          />

          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as TransferLogInput['supervisionLevel'])}
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

          <Button label="Save Transfer" onPress={handleSubmit} loading={loading} style={styles.submit} />
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
