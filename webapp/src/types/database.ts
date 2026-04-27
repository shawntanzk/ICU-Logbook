export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: 'admin' | 'user'
  disabled: boolean
  country: string | null
  med_reg_hmac: string | null
  med_reg_set_at: string | null
  created_at: string
}

export interface CaseLog {
  id: string
  owner_id: string
  supervisor_user_id: string | null
  observer_user_id: string | null
  external_supervisor_name: string | null
  date: string
  diagnosis: string
  icd10_code: string | null
  organ_systems: string[]
  cobatrice_domains: string[]
  supervision_level: string | null
  reflection: string | null
  patient_age: number | null
  patient_sex: string | null
  case_number: string | null
  primary_specialty: string | null
  level_of_care: string | null
  admitted: boolean | null
  cardiac_arrest: boolean | null
  involvement: string | null
  reviewed_again: boolean | null
  outcome: string | null
  communicated_with_relatives: boolean | null
  teaching_delivered: boolean | null
  teaching_recipient: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string | null
}

export interface ProcedureLog {
  id: string
  case_id: string | null
  owner_id: string
  supervisor_user_id: string | null
  observer_user_id: string | null
  external_supervisor_name: string | null
  procedure_type: string
  attempts: number | null
  success: boolean | null
  complications: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
  created_at: string
}

export interface AirwayLog {
  id: string
  case_id: string | null
  owner_id: string
  date: string
  is_rsi: boolean | null
  induction_agent: string | null
  neuromuscular_agent: string | null
  device: string | null
  tube_size: string | null
  tube_type: string | null
  attempts: number | null
  success: boolean | null
  cormack_lehane_grade: string | null
  dae_used: boolean | null
  dae_items: string[]
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface ArterialLineLog {
  id: string
  case_id: string | null
  owner_id: string
  date: string
  site: string | null
  uss_guided: boolean | null
  attempts: number | null
  success: boolean | null
  complications: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface CVCLog {
  id: string
  case_id: string | null
  owner_id: string
  date: string
  site: string | null
  is_second_cvc: boolean | null
  is_vascath: boolean | null
  uss_guided: boolean | null
  attempts: number | null
  success: boolean | null
  complications: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface USSLog {
  id: string
  case_id: string | null
  owner_id: string
  date: string
  study_type: string | null
  performed: boolean | null
  formal_report: boolean | null
  findings: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface RegionalBlockLog {
  id: string
  case_id: string | null
  owner_id: string
  date: string
  block_type: string | null
  block_type_other: string | null
  uss_guided: boolean | null
  catheter: boolean | null
  attempts: number | null
  success: boolean | null
  complications: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface WardReviewLog {
  id: string
  owner_id: string
  date: string
  patient_age: number | null
  patient_sex: string | null
  referring_specialty: string | null
  diagnosis: string | null
  icd10_code: string | null
  review_outcome: string | null
  communicated_with_relatives: boolean | null
  cobatrice_domains: string[]
  reflection: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface TransferLog {
  id: string
  owner_id: string
  date: string
  patient_age: number | null
  patient_sex: string | null
  diagnosis: string | null
  icd10_code: string | null
  transfer_type: string | null
  transfer_mode: string | null
  from_location: string | null
  to_location: string | null
  level_of_care: string | null
  procedures_during_transfer: string[]
  communicated_with_relatives: boolean | null
  reflection: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface EDAttendanceLog {
  id: string
  owner_id: string
  date: string
  patient_age: number | null
  patient_sex: string | null
  diagnosis: string | null
  icd10_code: string | null
  icu_admission: boolean | null
  presenting_category: string | null
  cardiac_arrest: boolean | null
  communicated_with_relatives: boolean | null
  cobatrice_domains: string[]
  reflection: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}

export interface MedicinePlacementLog {
  id: string
  owner_id: string
  start_date: string
  end_date: string | null
  specialty: string | null
  hospital: string | null
  ward: string | null
  patient_count: number | null
  teaching_delivered: boolean | null
  teaching_recipient: string | null
  cobatrice_domains: string[]
  reflection: string | null
  supervision_level: string | null
  supervisor_user_id: string | null
  external_supervisor_name: string | null
  approved_by: string | null
  approved_at: string | null
  deleted_at: string | null
}
