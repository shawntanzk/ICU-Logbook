import React, { useEffect, useState } from 'react';
import {
  ScrollView, Alert, StyleSheet, KeyboardAvoidingView,
  Platform, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { USSLogInput, USSLogSchema } from '../models/USSLog';
import { USSService } from '../services/USSService';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { RadioGroup } from '../components/RadioGroup';
import { SelectField } from '../components/SelectField';
import { ToggleField } from '../components/ToggleField';
import { Button } from '../components/Button';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import { USS_STUDY_TYPE_LABELS } from '../data/ussStudyTypes';
import {
  COLORS, SPACING, FONT_SIZE,
  SUPERVISION_LEVELS,
} from '../utils/constants';
import { todayISO } from '../utils/dateUtils';
import type { LogStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof USSLogInput, string>>;

const EMPTY_FORM: USSLogInput = {
  date: todayISO(),
  studyType: undefined,
  performed: true,
  formalReport: false,
  findings: '',
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

export function AddUSSScreen({ route }: LogStackProps<'AddUSS'>) {
  const { userId } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  const [form, setForm] = useState<USSLogInput>({ ...EMPTY_FORM, caseId: route.params?.caseId });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof USSLogInput>(key: K, value: USSLogInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const result = USSLogSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof USSLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      Alert.alert('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      await USSService.create(result.data);
      setForm({ ...EMPTY_FORM, date: todayISO(), caseId: route.params?.caseId });
      setErrors({});
      Alert.alert('USS Study Logged', 'Your USS study has been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save USS study. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const studyTypeOptions = USS_STUDY_TYPE_LABELS.map((s: string) => ({ id: s, label: s }));

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

          <SectionLabel title="Study" />
          <SelectField
            label="Study Type"
            options={studyTypeOptions}
            value={form.studyType ?? null}
            onChange={(v) => update('studyType', (v as USSLogInput['studyType']) ?? undefined)}
            required
            placeholder="Select study type…"
            error={errors.studyType}
          />
          <ToggleField
            label="Performed by me (not just observed)"
            value={form.performed ?? true}
            onChange={(v) => update('performed', v)}
          />
          <ToggleField
            label="Formal report / image submitted"
            value={form.formalReport ?? false}
            onChange={(v) => update('formalReport', v)}
          />
          <FormField
            label="Findings / Impression"
            placeholder="Optional"
            value={form.findings ?? ''}
            onChangeText={(v) => update('findings', v)}
            error={errors.findings}
            multiline
            numberOfLines={3}
            style={styles.textarea}
            textAlignVertical="top"
          />

          <SectionLabel title="Supervision" />
          <RadioGroup
            label="Supervision Level"
            required
            options={SUPERVISION_LEVELS}
            value={form.supervisionLevel}
            onChange={(v) => update('supervisionLevel', v as USSLogInput['supervisionLevel'])}
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

          <Button label="Save USS Study" onPress={handleSubmit} loading={loading} style={styles.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  textarea: { minHeight: 80 },
  submit: { marginTop: SPACING.sm },
});
