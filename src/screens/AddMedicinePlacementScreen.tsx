import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { MedicinePlacementLogInput, MedicinePlacementLogSchema } from '../models/MedicinePlacementLog';
import { MedicinePlacementService } from '../services/MedicinePlacementService';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { MultiSelect } from '../components/MultiSelect';
import { RadioGroup } from '../components/RadioGroup';
import { SelectField } from '../components/SelectField';
import { ToggleField } from '../components/ToggleField';
import { Button } from '../components/Button';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import {
  COLORS, SPACING, FONT_SIZE,
  COBATRICE_DOMAINS, SUPERVISION_LEVELS,
  SPECIALTY_OPTIONS, TEACHING_RECIPIENT_OPTIONS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';
import type { LogStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof MedicinePlacementLogInput, string>>;

const EMPTY_FORM: MedicinePlacementLogInput = {
  startDate: todayISO(),
  endDate: undefined,
  specialty: undefined,
  hospital: '',
  ward: '',
  patientCount: undefined,
  teachingDelivered: false,
  teachingRecipient: undefined,
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

export function AddMedicinePlacementScreen(_props: LogStackProps<'AddMedicinePlacement'>) {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [patientCountStr, setPatientCountStr] = useState('');

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<MedicinePlacementLogInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof MedicinePlacementLogInput>(key: K, value: MedicinePlacementLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const parsedCount = patientCountStr ? parseInt(patientCountStr, 10) || undefined : undefined;
    const formToValidate = { ...form, patientCount: parsedCount };

    const result = MedicinePlacementLogSchema.safeParse(formToValidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof MedicinePlacementLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await MedicinePlacementService.create(result.data);
      setForm({ ...EMPTY_FORM, startDate: todayISO() });
      setPatientCountStr('');
      setErrors({});
      Alert.alert('Placement Logged', 'Your placement has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save placement. Please try again.');
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
            label="Start Date"
            value={form.startDate}
            onChange={(v) => update('startDate', v)}
            maxDate={new Date()}
          />
          <DateField
            label="End Date (optional)"
            value={form.endDate ?? ''}
            onChange={(v) => update('endDate', v || undefined)}
          />

          <SectionLabel title="Placement Details" />
          <SelectField
            label="Specialty"
            options={SPECIALTY_OPTIONS}
            value={form.specialty ?? null}
            onChange={(v) => update('specialty', (v as MedicinePlacementLogInput['specialty']) ?? undefined)}
            required
            placeholder="Select specialty…"
            error={errors.specialty}
          />
          <FormField
            label="Hospital"
            value={form.hospital ?? ''}
            onChangeText={(v) => update('hospital', v)}
            error={errors.hospital}
          />
          <FormField
            label="Ward / Unit"
            value={form.ward ?? ''}
            onChangeText={(v) => update('ward', v)}
            error={errors.ward}
          />
          <FormField
            label="Approximate Patients Seen"
            value={patientCountStr}
            onChangeText={(v) => setPatientCountStr(v)}
            keyboardType="numeric"
            error={errors.patientCount}
          />

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
              onChange={(v) => update('teachingRecipient', (v as MedicinePlacementLogInput['teachingRecipient']) ?? undefined)}
              clearable
            />
          )}

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
            onChange={(v) => update('supervisionLevel', v as MedicinePlacementLogInput['supervisionLevel'])}
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

          <Button label="Save Placement" onPress={handleSubmit} loading={loading} style={styles.submit} />
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
