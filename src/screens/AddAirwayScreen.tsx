import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { AirwayLogInput, AirwayLogSchema } from '../models/AirwayLog';
import { AirwayService } from '../services/AirwayService';
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
  RSI_INDUCTION_AGENTS,
  RSI_NEUROMUSCULAR_AGENTS,
  INTUBATION_DEVICE_LABELS,
  CORMACK_LEHANE_GRADES,
  DAE_ITEMS,
} from '../data/airwayItems';
import {
  COLORS, SPACING, FONT_SIZE,
  SUPERVISION_LEVELS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';
import type { LogStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof AirwayLogInput, string>>;

const TUBE_ROUTE_OPTIONS = [
  { id: 'oral', label: 'Oral' },
  { id: 'nasal', label: 'Nasal' },
];

const EMPTY_FORM: AirwayLogInput = {
  date: todayISO(),
  isRsi: false,
  inductionAgent: undefined,
  neuromuscularAgent: undefined,
  device: undefined,
  tubeSize: undefined,
  tubeType: undefined,
  attempts: 1,
  success: true,
  cormackLehaneGrade: undefined,
  daeUsed: false,
  daeItems: [],
  supervisionLevel: 'local',
  supervisorUserId: null,
  externalSupervisorName: null,
  notes: '',
};

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 8, marginTop: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
    </View>
  );
}

export function AddAirwayScreen({ route }: LogStackProps<'AddAirway'>) {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [attemptsStr, setAttemptsStr] = useState('1');
  const [tubeSizeStr, setTubeSizeStr] = useState('');

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<AirwayLogInput>({ ...EMPTY_FORM, caseId: route.params?.caseId });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof AirwayLogInput>(key: K, value: AirwayLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const formToValidate = {
      ...form,
      attempts: parseInt(attemptsStr, 10) || 1,
      tubeSize: tubeSizeStr ? parseFloat(tubeSizeStr) : undefined,
    };

    const result = AirwayLogSchema.safeParse(formToValidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AirwayLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await AirwayService.create(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO(), caseId: route.params?.caseId });
      setAttemptsStr('1');
      setTubeSizeStr('');
      setErrors({});
      Alert.alert('Airway Logged', 'Your airway log has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save airway log. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inductionAgentOptions = RSI_INDUCTION_AGENTS.map((a: string) => ({ id: a, label: a }));
  const neuromuscularAgentOptions = RSI_NEUROMUSCULAR_AGENTS.map((a: string) => ({ id: a, label: a }));
  const deviceOptions = INTUBATION_DEVICE_LABELS.map((d: string) => ({ id: d, label: d }));
  const clGradeOptions = CORMACK_LEHANE_GRADES.map((g: string) => ({ id: g, label: g }));
  const daeItemOptions = DAE_ITEMS.map((item: string) => ({ id: item, label: item }));

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

          <SectionLabel title="RSI" />
          <ToggleField
            label="Rapid Sequence Induction performed"
            value={form.isRsi ?? false}
            onChange={(v) => {
              update('isRsi', v);
              if (!v) {
                update('inductionAgent', undefined);
                update('neuromuscularAgent', undefined);
              }
            }}
          />
          {form.isRsi && (
            <>
              <SelectField
                label="Induction Agent"
                options={inductionAgentOptions}
                value={form.inductionAgent ?? null}
                onChange={(v) => update('inductionAgent', (v as AirwayLogInput['inductionAgent']) ?? undefined)}
                clearable
              />
              <SelectField
                label="Neuromuscular Agent"
                options={neuromuscularAgentOptions}
                value={form.neuromuscularAgent ?? null}
                onChange={(v) => update('neuromuscularAgent', (v as AirwayLogInput['neuromuscularAgent']) ?? undefined)}
                clearable
              />
            </>
          )}

          <SectionLabel title="Intubation" />
          <SelectField
            label="Device"
            options={deviceOptions}
            value={form.device ?? null}
            onChange={(v) => update('device', (v as AirwayLogInput['device']) ?? undefined)}
            clearable
            placeholder="Select device…"
          />
          <FormField
            label="Tube Size (mm ID)"
            placeholder="e.g. 7.5"
            value={tubeSizeStr}
            onChangeText={(v) => setTubeSizeStr(v)}
            keyboardType="decimal-pad"
            error={errors.tubeSize}
          />
          <RadioGroup
            label="Tube Route"
            options={TUBE_ROUTE_OPTIONS}
            value={form.tubeType ?? ''}
            onChange={(v) => update('tubeType', v as AirwayLogInput['tubeType'])}
            error={errors.tubeType}
          />
          <FormField
            label="Attempts"
            value={attemptsStr}
            onChangeText={(v) => setAttemptsStr(v)}
            keyboardType="number-pad"
            error={errors.attempts}
          />
          <ToggleField
            label="Successful intubation"
            value={form.success ?? true}
            onChange={(v) => update('success', v)}
          />
          <SelectField
            label="Cormack-Lehane Grade"
            options={clGradeOptions}
            value={form.cormackLehaneGrade ?? null}
            onChange={(v) => update('cormackLehaneGrade', (v as AirwayLogInput['cormackLehaneGrade']) ?? undefined)}
            clearable
          />

          <SectionLabel title="Difficult Airway Equipment" />
          <ToggleField
            label="DAE Used"
            value={form.daeUsed ?? false}
            onChange={(v) => {
              update('daeUsed', v);
              if (!v) update('daeItems', []);
            }}
          />
          {form.daeUsed && (
            <MultiSelect
              label="DAE Items Used"
              options={daeItemOptions}
              selected={form.daeItems ?? []}
              onChange={(v) => update('daeItems', v)}
              error={errors.daeItems}
            />
          )}

          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as AirwayLogInput['supervisionLevel'])}
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

          <SectionLabel title="Notes" />
          <FormField
            label="Notes"
            placeholder="Any additional notes…"
            value={form.notes ?? ''}
            onChangeText={(v) => update('notes', v)}
            error={errors.notes}
            multiline
            numberOfLines={4}
            style={styles.textarea}
            textAlignVertical="top"
          />

          <Button label="Save Airway Log" onPress={handleSubmit} loading={loading} style={styles.submit} />
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
