import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ─── Root (auth gate) ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Setup: undefined;
  Consent: undefined;
  Main: undefined;
};

// ─── Dashboard stack (Dashboard → Competency) ─────────────────────────────────
export type DashboardStackParamList = {
  DashboardHome: undefined;
  Competency: undefined;
};

// ─── Stack inside Cases tab ───────────────────────────────────────────────────
export type CasesStackParamList = {
  CaseList: undefined;
  CaseDetail: { caseId: string };
};

// ─── Stack inside Procedures tab ─────────────────────────────────────────────
export type ProceduresStackParamList = {
  ProcedureList: undefined;
  AddProcedure: { caseId?: string };
};

// ─── Bottom tab navigator ─────────────────────────────────────────────────────
export type TabParamList = {
  Dashboard: undefined;
  Cases: undefined;
  AddCase: undefined;
  Procedures: undefined;
  Settings: undefined;
};

// ─── Settings stack (Settings → Consent / Export) ─────────────────────────────
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Consent: undefined;
  Export: undefined;
  AdminPanel: undefined;
};

// ─── Convenience prop types ───────────────────────────────────────────────────
export type CasesStackProps<T extends keyof CasesStackParamList> =
  NativeStackScreenProps<CasesStackParamList, T>;

export type ProceduresStackProps<T extends keyof ProceduresStackParamList> =
  NativeStackScreenProps<ProceduresStackParamList, T>;

export type DashboardStackProps<T extends keyof DashboardStackParamList> =
  NativeStackScreenProps<DashboardStackParamList, T>;
