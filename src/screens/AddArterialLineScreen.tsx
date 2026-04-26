import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { ArterialLineLogInput, ArterialLineLogSchema } from '../models/ArterialLineLog';
import { ArterialLineService } from '../services/ArterialLineService';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { RadioGroup } from '../components/RadioGroup';
import { SelectField } from '../components/SelectField';
import { ToggleField } from '../components/ToggleField';
import { Button } from '../components/Button';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import { ARTERIAL_LINE_SITE_LABELS } from '../data/arterialLineSites';
import {
  COLORS, SPACING, FONT_SIZE,
  SUPERVISION_LEVELS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';
import type { LogStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof ArterialLineLogInput, string>>;

const EMPTY_FORM: ArterialLineLogInput = {
  date: todayISO(),
  site: '' as string,
  ussGuided: false,
  attempts: 1,
  success: true,
  complications: '',
  supervisionLevel: 'local',
  supervisorUserId: null,
  externalSupervisorName: null,
};

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 8, marginTop: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
    </View>
  );
}

export function AddArterialLineScreen({ route }: LogStackProps<'AddArterialLine'>) {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [attemptsStr, setAttemptsStr] = useState('1');

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<ArterialLineLogInput>({ ...EMPTY_FORM, caseId: route.params?.caseId });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ArterialLineLogInput>(key: K, value: ArterialLineLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const formToValidate = {
      ...form,
      attempts: parseInt(attemptsStr, 10) || 1,
    };

    const result = ArterialLineLogSchema.safeParse(formToValidate);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ArterialLineLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await ArterialLineService.create(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO(), caseId: route.params?.caseId });
      setAttemptsStr('1');
      setErrors({});
      Alert.alert('Arterial Line Logged', 'Your arterial line log has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save arterial line log. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const siteOptions = ARTERIAL_LINE_SITE_LABELS.map((s: string) => ({ id: s, label: s }));

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

          <SectionLabel title="Insertion" />
          <SelectField
            label="Site"
            options={siteOptions}
            value={form.site ?? null}
            onChange={(v) => update('site', (v as ArterialLineLogInput['site']) ?? undefined)}
            required
            placeholder="Select site…"
            error={errors.site}
          />
          <ToggleField
            label="USS Guided"
            value={form.ussGuided ?? false}
            onChange={(v) => update('ussGuided', v)}
          />
          <FormField
            label="Attempts"
            value={attemptsStr}
            onChangeText={(v) => setAttemptsStr(v)}
            keyboardType="number-pad"
            error={errors.attempts}
          />
          <ToggleField
            label="Successful"
            value={form.success ?? true}
            onChange={(v) => update('success', v)}
          />
          <FormField
            label="Complications"
            placeholder="Optional"
            value={form.complications ?? ''}
            onChangeText={(v) => update('complications', v)}
            error={errors.complications}
            multiline
            numberOfLines={2}
            style={styles.textarea}
            textAlignVertical="top"
          />

          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as ArterialLineLogInput['supervisionLevel'])}
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

          <Button label="Save Arterial Line" onPress={handleSubmit} loading={loading} style={styles.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  textarea: { minHeight: 60 },
  submit: { marginTop: SPACING.sm },
});
