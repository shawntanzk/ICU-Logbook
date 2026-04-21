import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProcedureStore } from '../store/procedureStore';
import { useCaseStore } from '../store/caseStore';
import { useAuthStore } from '../store/authStore';
import { ProcedureLogSchema, ProcedureLogInput } from '../models/ProcedureLog';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { UserPicker } from '../components/UserPicker';
import { listUsers, ManagedUser } from '../services/AuthService';
import { COLORS, FONT_SIZE, PROCEDURE_TYPES, RADIUS, SPACING } from '../utils/constants';
import { formatDisplay } from '../utils/dateUtils';
import type { ProceduresStackProps } from '../navigation/types';

type FieldErrors = Partial<Record<keyof ProcedureLogInput, string>>;

export function EditProcedureScreen({ route, navigation }: ProceduresStackProps<'EditProcedure'>) {
  const { procedureId } = route.params;
  const { procedures, updateProcedure } = useProcedureStore();
  const { cases } = useCaseStore();
  const { userId, role } = useAuthStore();

  const existing = useMemo(() => procedures.find((p) => p.id === procedureId), [procedures, procedureId]);

  const [procedureType, setProcedureType] = useState('');
  const [attempts, setAttempts] = useState('1');
  const [success, setSuccess] = useState(true);
  const [complications, setComplications] = useState('');
  const [caseId, setCaseId] = useState('');
  const [supervisorUserId, setSupervisorUserId] = useState<string | null>(null);
  const [externalSupervisorName, setExternalSupervisorName] = useState<string>('');
  const [observerUserId, setObserverUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    if (!existing) return;
    setProcedureType(existing.procedureType);
    setAttempts(String(existing.attempts));
    setSuccess(existing.success);
    setComplications(existing.complications ?? '');
    setCaseId(existing.caseId ?? '');
    setSupervisorUserId(existing.supervisorUserId ?? null);
    setExternalSupervisorName(existing.externalSupervisorName ?? '');
    setObserverUserId(existing.observerUserId ?? null);
  }, [existing]);

  if (!existing) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Procedure not found.</Text>
      </SafeAreaView>
    );
  }

  const canEdit = existing.ownerId === userId || role === 'admin';
  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>You can only edit procedures you logged.</Text>
      </SafeAreaView>
    );
  }

  const otherUsers = users.filter((u) => u.id !== userId && !u.disabled);

  async function handleSubmit() {
    const input: ProcedureLogInput = {
      procedureType,
      attempts: parseInt(attempts, 10) || 1,
      success,
      complications: complications || undefined,
      caseId: caseId || undefined,
      supervisorUserId: externalSupervisorName.trim() ? null : supervisorUserId,
      externalSupervisorName: externalSupervisorName.trim() || null,
      observerUserId,
    };
    const result = ProcedureLogSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProcedureLogInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      await updateProcedure(procedureId, result.data);
      Alert.alert('Saved', 'Procedure updated.', [
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
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Procedure Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeGrid}>
            {PROCEDURE_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt}
                style={[styles.typeChip, procedureType === pt && styles.typeChipActive]}
                onPress={() => {
                  setProcedureType(pt);
                  if (errors.procedureType) setErrors((e) => ({ ...e, procedureType: undefined }));
                }}
              >
                <Text style={[styles.typeChipText, procedureType === pt && styles.typeChipTextActive]}>{pt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.procedureType ? <Text style={styles.error}>{errors.procedureType}</Text> : null}

          <FormField label="Number of Attempts" required value={attempts}
            onChangeText={(v) => setAttempts(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />

          <View style={styles.successRow}>
            <View style={styles.successLabel}>
              <Text style={styles.sectionLabel}>Outcome</Text>
              <Text style={[styles.successValue, success ? styles.successGreen : styles.successRed]}>
                {success ? 'Successful' : 'Unsuccessful'}
              </Text>
            </View>
            <Switch value={success} onValueChange={setSuccess}
              trackColor={{ false: COLORS.error, true: COLORS.success }} thumbColor={COLORS.white} />
          </View>

          <FormField label="Complications" value={complications} onChangeText={setComplications}
            multiline numberOfLines={3} style={styles.textarea} textAlignVertical="top"
          />

          {cases.length > 0 && (
            <View style={styles.caseLink}>
              <Text style={styles.sectionLabel}>Link to Case (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.caseScroll}>
                <TouchableOpacity style={[styles.caseChip, !caseId && styles.caseChipActive]} onPress={() => setCaseId('')}>
                  <Text style={[styles.caseChipText, !caseId && styles.caseChipTextActive]}>None</Text>
                </TouchableOpacity>
                {cases.slice(0, 10).map((c) => (
                  <TouchableOpacity key={c.id}
                    style={[styles.caseChip, caseId === c.id && styles.caseChipActive]}
                    onPress={() => setCaseId(c.id)}
                  >
                    <Text style={[styles.caseChipText, caseId === c.id && styles.caseChipTextActive]} numberOfLines={1}>
                      {formatDisplay(c.date)} — {c.diagnosis.substring(0, 20)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <UserPicker label="Supervised by" users={otherUsers}
            value={supervisorUserId}
            onChange={(v) => { setSupervisorUserId(v); if (v) setExternalSupervisorName(''); }}
            placeholder="None"
          />
          <FormField label="Supervisor not on system" value={externalSupervisorName}
            onChangeText={(v) => { setExternalSupervisorName(v); if (v.trim()) setSupervisorUserId(null); }}
            hint="Changing supervisors clears any prior approval."
            autoCapitalize="words"
          />
          <UserPicker label="Observed by" users={otherUsers}
            value={observerUserId} onChange={setObserverUserId} placeholder="None"
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
  sectionLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  required: { color: COLORS.error },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  typeChip: {
    paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, marginBottom: SPACING.xs,
  },
  typeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeChipText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  typeChipTextActive: { color: COLORS.white },
  error: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginBottom: SPACING.md },
  successRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border,
  },
  successLabel: { flex: 1 },
  successValue: { fontSize: FONT_SIZE.md, fontWeight: '600', marginTop: 2 },
  successGreen: { color: COLORS.success },
  successRed: { color: COLORS.error },
  textarea: { minHeight: 80 },
  caseLink: { marginBottom: SPACING.md },
  caseScroll: { flexGrow: 0 },
  caseChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, marginRight: SPACING.xs, maxWidth: 220,
  },
  caseChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  caseChipText: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '500' },
  caseChipTextActive: { color: COLORS.white },
  submit: { marginTop: SPACING.sm },
  notFound: { textAlign: 'center', marginTop: SPACING.xxl, color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
});
