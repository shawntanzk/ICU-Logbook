import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ─── Root (auth gate) ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  CompleteRegistration: undefined;
  Consent: undefined;
  Terms: undefined;
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
  EditCase: { caseId: string };
  AddCase: undefined;
};

// ─── Stack inside Procedures tab ─────────────────────────────────────────────
export type ProceduresStackParamList = {
  ProcedureList: undefined;
  AddProcedure: { caseId?: string };
  EditProcedure: { procedureId: string };
};

// ─── Log stack (hub + all entry screens) ─────────────────────────────────────
export type LogStackParamList = {
  LogHub: undefined;
  // Clinical episodes
  AddCase: undefined;
  AddWardReview: undefined;
  AddTransfer: undefined;
  AddED: undefined;
  AddMedicinePlacement: undefined;
  // Procedures
  AddAirway: { caseId?: string };
  AddArterialLine: { caseId?: string };
  AddCVC: { caseId?: string };
  AddUSS: { caseId?: string };
  AddRegionalBlock: { caseId?: string };
};

// ─── Bottom tab navigator ─────────────────────────────────────────────────────
export type TabParamList = {
  Dashboard: undefined;
  Cases: undefined;
  Log: undefined;     // replaced AddCase with Log (hub)
  Procedures: undefined;
  Settings: undefined;
};

// ─── Settings stack (Settings → Consent / Export) ─────────────────────────────
export type SettingsStackParamList = {
  SettingsHome: undefined;
  Consent: undefined;
  Export: undefined;
  AdminPanel: undefined;
  ChangePassword: undefined;
  Conflicts: undefined;
  Terms: undefined;
};

// ─── Convenience prop types ───────────────────────────────────────────────────
export type CasesStackProps<T extends keyof CasesStackParamList> =
  NativeStackScreenProps<CasesStackParamList, T>;

export type ProceduresStackProps<T extends keyof ProceduresStackParamList> =
  NativeStackScreenProps<ProceduresStackParamList, T>;

export type DashboardStackProps<T extends keyof DashboardStackParamList> =
  NativeStackScreenProps<DashboardStackParamList, T>;

export type LogStackProps<T extends keyof LogStackParamList> =
  NativeStackScreenProps<LogStackParamList, T>;
