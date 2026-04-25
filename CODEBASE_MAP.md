# ICU Logbook — Codebase Map

> **Purpose:** Feed this file to an LLM instead of loading the full repo into context.
> Stack: React Native · Expo SDK 52 · Bare workflow · TypeScript strict · Zustand · React Navigation v6 · Supabase (Postgres + Edge Functions) · expo-sqlite (local cache)
> Graph: 570 nodes · 4,678 edges · 139 files · Last mapped: 2026-04-25

---

## 1. Repository Root

| File | Purpose |
|------|---------|
| `App.tsx` | Entry point. Boots SQLite, runs local migrations, hydrates auth + consent + offline + network stores, renders `RootNavigator`. Applies WebCrypto polyfill for PKCE. |
| `app.json` | Expo config — bundle ID `com.iculogbook.app`, icons, splash, iOS privacy manifest, Android permissions (`INTERNET`, `VIBRATE`), deep-link scheme `iculogbook://`. |
| `eas.json` | EAS build profiles: `development` (dev client, internal), `preview` (APK, internal), `production` (AAB + IPA, autoIncrement). Submit config for App Store + Play Store. |
| `package.json` | Dependencies — key: `expo`, `@supabase/supabase-js`, `expo-sqlite`, `expo-secure-store`, `expo-crypto`, `@react-navigation/native`, `zustand`, `expo-auth-session`. |
| `tsconfig.json` | Strict TypeScript — `"strict": true`. |
| `.env` / `.env.example` | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never committed. |
| `.github/workflows/ci.yml` | GitHub Actions CI — two jobs: `build-android` and `build-ios` using `eas build --profile production --non-interactive --no-wait`. Uses `EXPO_TOKEN` secret. |
| `docs/privacy-policy.html` | GDPR-compliant privacy policy. Must be hosted publicly; URL goes in `app.json → extra.privacyPolicyUrl`. |
| `docs/validator.html` | Standalone HTML tool for training bodies to validate medical registration numbers. Calls `validate-registration` Edge Function with `X-Validator-Secret` header. |

---

## 2. Navigation (`src/navigation/`)

### `types.ts`
Defines `RootStackParamList`:
```
Login | Register | CompleteRegistration | Terms | Main
```
And `MainTabParamList`:
```
Dashboard | LogHub | Competency | Settings
```

### `RootNavigator.tsx`
**Gate order (sequential, not nested):**
1. `!isLoggedIn` → shows `Login` + `Register` screens
2. `isLoggedIn && !termsAccepted` → shows `Terms`
3. `isLoggedIn && termsAccepted && !profileComplete` → shows `CompleteRegistration`
4. `isLoggedIn && termsAccepted && profileComplete` → shows `Main` (tab navigator)

Reads from `useAuthStore`: `isLoggedIn`, `termsAccepted`, `profileComplete`.

---

## 3. Screens (`src/screens/`)

### Auth & Onboarding
| Screen | Purpose | Key actions |
|--------|---------|-------------|
| `LoginScreen.tsx` | Sign-in only. Links to Register. Google OAuth button. | `authStore.signIn`, `authStore.signInWithGoogle`, `navigation.navigate('Register')` |
| `RegisterScreen.tsx` | New account: name, email, password, confirmPassword, country (SelectField), medRegNumber, terms checkbox. | `supabase.functions.invoke('register', { body })` → on success navigate to Login |
| `CompleteRegistrationScreen.tsx` | Shown post-Google-OAuth when `profileComplete === false`. Collects country + medRegNumber. | `authStore.completeRegistration({ country, medRegNumber })` |
| `TermsScreen.tsx` | Hard gate — must accept Terms & Privacy to proceed. | `termsStore.accept()` / `authStore.signOut()` |

### Main Tabs
| Screen | Purpose |
|--------|---------|
| `DashboardScreen.tsx` | Stats overview — logged cases, supervised cases, procedures, filter pills. |
| `LogHubScreen.tsx` | Entry point for all 10 log types. Routes to each `Add*Screen`. |
| `CompetencyScreen.tsx` | COBATRICE domain heat map. Colour-coded by case count per domain. Uses `heatColor(n)` / `heatLabel(n)`. |
| `SettingsScreen.tsx` | Sync, offline toggle, export (ARCP CSV), consent, Google link/unlink, change password, delete account, admin panel. |

### Case & Procedure Logs
| Screen | Purpose |
|--------|---------|
| `CaseListScreen.tsx` | Filterable list of ICU/HDU cases. `CaseItem` component renders each row. |
| `CaseDetailScreen.tsx` | Full case view. Approve / Edit / Delete buttons (owner/admin only for edit/delete; supervisor for approve). |
| `AddCaseScreen.tsx` | New ICU/HDU case form. |
| `EditCaseScreen.tsx` | Edit existing case — owner/admin only. Uses `DateField`, `FormField`, `ICD10Autocomplete`, `MultiSelect`, `RadioGroup`, `UserPicker`. |
| `ProcedureListScreen.tsx` | List of procedure logs. `handleApprove` / `handleRevoke` for supervisors. |
| `AddProcedureScreen.tsx` | Generic procedure log form. |
| `EditProcedureScreen.tsx` | Edit procedure — owner/admin only. |

### Clinical Log Entry Screens (all in `src/screens/`)
| Screen | Log type |
|--------|---------|
| `AddWardReviewScreen.tsx` | Ward review |
| `AddTransferScreen.tsx` | Patient transfer |
| `AddEDScreen.tsx` | ED attendance |
| `AddMedicinePlacementScreen.tsx` | Medicine placement |
| `AddAirwayScreen.tsx` | Airway management |
| `AddArterialLineScreen.tsx` | Arterial line |
| `AddCVCScreen.tsx` | Central venous catheter |
| `AddUSSScreen.tsx` | Ultrasound study |
| `AddRegionalBlockScreen.tsx` | Regional anaesthesia block |

### Utility Screens
| Screen | Purpose |
|--------|---------|
| `ExportScreen.tsx` | ARCP CSV export + FHIR/JSON-LD/openEHR options. Calls `ARCPExporter`. |
| `ConflictsScreen.tsx` | Sync conflict resolver — keep local or keep remote. |
| `ConsentScreen.tsx` | FAIR data-sharing consent (four toggles). |
| `AdminPanelScreen.tsx` | Admin-only: list users, cycle role, toggle disabled, reset password, delete, create user. Uses `CreateUserModal`. |
| `ChangePasswordScreen.tsx` | Change password with `PasswordStrengthMeter` validation. |

---

## 4. State Management (`src/store/`)

All stores use **Zustand**. Persist to AsyncStorage where noted.

### `authStore.ts`
**State:** `userId`, `email`, `displayName`, `role` (`'admin'|'user'`), `isLoggedIn`, `termsAccepted`, `country`, `profileComplete`, `isLoading`, `error`

**Key actions:**
| Action | What it does |
|--------|-------------|
| `restore()` | Calls `restoreSession()` from AuthService, hydrates store |
| `signIn(email, password)` | Delegates to `AuthService.signIn` |
| `signInWithGoogle()` | PKCE OAuth flow via `AuthService.signInWithGoogle` |
| `signUp(input)` | Old path — superseded by `RegisterScreen` calling Edge Function directly |
| `completeRegistration({ country, medRegNumber })` | Calls `AuthService.setMedicalRegistration` → sets `profileComplete: true` on success |
| `signOut()` | Clears session + resets store |
| `apply(user \| null)` | Internal — maps `AuthedUser` → store state; sets `profileComplete = !!country && med_reg_set` |

### `caseStore.ts`
**State:** `cases[]`, `stats`, `isSyncing`
**Key actions:** `load()`, `create(input)`, `update(id, patch)`, `approve(id)`, `revokeApproval(id)`, `softDelete(id)`, `triggerSync()` (fire-and-forget sync after every write)

### `procedureStore.ts`
Mirror of `caseStore` for procedures. Same pattern.

### `syncStore.ts`
**State:** `isSyncing`, `status` (`'idle'|'syncing'|'done'|'error'`), `lastResult`, `conflictCount`
**Key actions:** `runSync()` → calls `SyncService.syncPending()`

### `networkStore.ts`
**State:** `isOnline` (boolean)
`initNetworkTracking()` — wires up NetInfo listener; called from `App.tsx`.

### `offlineStore.ts`
**State:** `isOfflineOnly` (persisted)
When `true`, `SyncService.syncPending()` short-circuits immediately.

### `termsStore.ts`
**State:** `isTermsAccepted` (persisted, versioned)
`accept()` / `decline()`. Version bump forces re-acceptance.

### `consentStore.ts`
**State:** Four FAIR consent flags (persisted). Read by `DeidentifyService` before export.

---

## 5. Services (`src/services/`)

### `AuthService.ts`
All Supabase auth operations. Key exports:

| Function | Description |
|----------|-------------|
| `signIn(email, password)` | `supabase.auth.signInWithPassword` |
| `signUp(input)` | `supabase.auth.signUp` — old path, largely superseded |
| `signInWithGoogle()` | PKCE via `expo-auth-session` + `makeRedirectUri('iculogbook://auth-callback')` |
| `setMedicalRegistration({ country, medRegNumber })` | Calls `set-registration` Edge Function with JWT |
| `restoreSession()` | `supabase.auth.getSession()` + `loadProfile()` |
| `listIdentities()` / `linkGoogleIdentity()` / `unlinkGoogleIdentity()` | Identity linking |
| `listUsers()` / `createUser()` / `updateUserRole()` / `setUserDisabled()` / `deleteUser()` | Admin ops — route through `admin-users` Edge Function |
| `deleteOwnAccount()` | Calls `admin-users` Edge Function, then `supabase.auth.signOut()` |
| `getUserDirectory()` | Returns `{ [userId]: displayName }` map used by `UserPicker` |

**`AuthedUser` interface:** `{ id, email, displayName, role, country, profileComplete }`
**`profileComplete`** = `!!profiles.country && (med_reg_hmac IS NOT NULL)`

### `AuthScope.ts`
SQL WHERE fragment generators for local SQLite reads. Prevents cross-user data leakage in queries.

| Function | Admin result | User result |
|----------|-------------|------------|
| `scopedWhere()` | `1=1` | `owner_id = ?` |
| `caseScopedWhere()` | `1=1` | `owner_id=? OR supervisor_user_id=? OR observer_user_id=?` |
| `procedureScopedWhere()` | same as case | same |
| `supervisedScopedWhere()` | `1=1` | `supervisor_user_id=?` |

### `authState.ts`
Singleton ref `{ userId, role }` — breaks the circular dependency between `AuthScope` (needed by services) and `authStore` (needs services).

### `CaseService.ts`
`CaseServiceImpl` implements `IDataService<CaseLog>`:
- `findAll(filters?)` — local SQLite SELECT with `caseScopedWhere()`
- `create(input)` — INSERT into SQLite, marks `synced=0`, calls `triggerSync()`
- `update(id, patch)` — UPDATE, marks `synced=0`
- `approve(id)` / `revokeApproval(id)` — sets `approved_by` + `approved_at`
- `softDelete(id)` — sets `deleted_at`, marks `synced=0`
- `getStats()` — aggregates for dashboard

### `ProcedureService.ts`
`ProcedureServiceImpl` — same pattern as CaseService. Extra: `findByCaseId(caseId)`, `getSuccessRate()`, `getTypeCounts()`.

### Clinical log services (one each, same CRUD pattern)
`AirwayService`, `ArterialLineService`, `CVCService`, `USSService`, `RegionalBlockService`, `WardReviewService`, `TransferService`, `EDAttendanceService`, `MedicinePlacementService`

### `SyncService.ts`
`SyncServiceImpl` implements `ISyncService`:
- `syncPending()` — push all `synced=0` rows to Supabase, pull rows newer than last watermark, detect conflicts
- Push: upsert to Supabase table, mark local `synced=1`
- Pull: `INSERT OR REPLACE` into SQLite; if local row has unsynced edits → set `conflict=1`
- `listConflicts()` / `resolveKeepLocal(id)` / `resolveKeepRemote(id)`
- Checks `isOfflineOnly()` first — short-circuits if true

### `DeidentifyService.ts`
Used by exporters before sending data out. `scrubText(s)` removes dates/names/numbers. `deidentifyCase(c)` / `deidentifyProcedure(p)` return anonymised copies. Respects `consentStore` flags.

### `QualityService.ts`
Computes a completeness score (0–100) per case based on filled fields. Used to show "quality score" in case detail.

### `ProvenanceService.ts`
`captureProvenance()` — builds `Provenance` object with `deviceId`, `locale`, `timezone`, `capturedAt`. Attached to every new log entry for FAIR compliance.

### `ConsentService.ts`
CRUD on `app_settings` table for the four FAIR consent flags. `hasMadeConsentChoice()` gates the `ConsentScreen`.

### `SettingsService.ts`
Generic `getSetting(key)` / `setSetting(key, value)` on local `app_settings` SQLite table.

### `secureStorage.ts`
Chunked `expo-secure-store` adapter (SecureStore has a 2KB limit per key). Used as the Supabase session storage backend.

### `supabase.ts`
Supabase client singleton. Configured with `secureStorage` adapter and PKCE auth flow.

### `analytics.ts`
Stub — no-op for now. Replace with real analytics provider when needed.

### `errorReporting.ts`
Sentry-ready no-op: `init()`, `setUser(u)`, `capture(err)`. Wire in `@sentry/react-native` when ready.

### Export services (`src/services/export/`)

| File | Format | Notes |
|------|--------|-------|
| `ARCPExporter.ts` | CSV | ARCP-ready. Covers all 10 log types. Main export path from `ExportScreen`. |
| `FHIRExporter.ts` | FHIR R4 Bundle JSON | Calls `deidentifyCase/Procedure` first. `caseToFhir`, `procedureToFhir`, `casesToFhirBundle`. |
| `JSONLDExporter.ts` | JSON-LD | Schema.org + custom medical vocab. Calls deidentify. |
| `OpenEHRExporter.ts` | openEHR composition JSON | `caseToOpenEHR`, `casesToOpenEHR`. |
| `DataDictionary.ts` | Markdown | `dictionaryToMarkdown()` — documents all field meanings. |
| `index.ts` | Re-exports | Barrel export for all exporters. |

---

## 6. Data Layer (`src/database/`)

### `client.native.ts`
Primary SQLite client (used on iOS/Android).
- `getDatabase()` — returns singleton `SQLiteDatabase`
- `initializeDatabase()` — runs all local migrations in order
- `wipeLocalData()` — used by "delete account" and test resets

### `client.web.ts`
No-op stubs for web/testing — same interface, no actual DB.

### `migrations.ts`
Array of `{ version, up(db) }` objects. Applied sequentially. Never edit existing entries — append only.

**Local migration versions:**
| Version | Change |
|---------|--------|
| v1 | Base tables: `case_logs`, `procedure_logs`, `app_settings`, `schema_version` |
| v2 | FAIR fields: `coded_diagnosis`, `provenance`, `quality_score`, `consent_flags`, `license` |
| v3 | `owner_id` on case + procedure logs |
| v4 | Case supervision: `supervisor_user_id`, `observer_user_id` |
| v5 | Procedure supervision: same |
| v6 | Approval workflow: `approved_by`, `approved_at`, `external_supervisor_name` |
| v7 | Sync bookkeeping: `server_updated_at`, `deleted_at`, `conflict` |
| v8 | Retry fields: `sync_retry_count`, `sync_last_error` + indexes on `(synced, conflict)` |

---

## 7. Models (`src/models/`)

All models are TypeScript interfaces. No Zod runtime validation in production paths (validation at form level only).

| File | Type | Key fields |
|------|------|-----------|
| `CaseLog.ts` | `CaseLog` | `id`, `owner_id`, `date`, `diagnosis` (ICD-10), `coded_diagnosis` (CodedValue), `cobatrice_domains[]`, `organ_systems[]`, `supervision_level`, `supervisor_user_id`, `approved_by`, `approved_at`, `quality_score`, `provenance`, sync fields |
| `ProcedureLog.ts` | `ProcedureLog` | `id`, `case_id`, `type`, `outcome`, `supervision_level`, `supervisor_user_id`, `approved_by`, `approved_at`, sync fields |
| `AirwayLog.ts` | `AirwayLog` | Airway-specific fields |
| `ArterialLineLog.ts` | `ArterialLineLog` | Site, attempt count, outcome |
| `CVCLog.ts` | `CVCLog` | Site, lumen count, USS-guided flag |
| `USSLog.ts` | `USSLog` | Study type, findings, image quality |
| `RegionalBlockLog.ts` | `RegionalBlockLog` | Block type, approach, outcome |
| `WardReviewLog.ts` | `WardReviewLog` | Ward, reason, management changes |
| `TransferLog.ts` | `TransferLog` | Origin, destination, clinical state |
| `EDAttendanceLog.ts` | `EDAttendanceLog` | Presenting complaint, disposition |
| `MedicinePlacementLog.ts` | `MedicinePlacementLog` | Specialty, learning points |
| `CodedValue.ts` | `CodedValue` | `{ code, display, system }` — used for ICD-10, COBATRICE, organ systems |
| `Provenance.ts` | `Provenance` | `{ deviceId, locale, timezone, capturedAt }` |

---

## 8. Reference Data (`src/data/`)

Static lookup tables bundled with the app — no network call needed.

| File | Contents |
|------|---------|
| `countries.ts` | 195 ISO 3166-1 alpha-2 countries as `Country[]`. Exports `COUNTRIES`, `COUNTRY_OPTIONS` (id/label), `countryName(code)`. |
| `cobatrice.ts` | COBATRICE ICU competency domains. `cobatriceToCoded(domain)` → `CodedValue`. |
| `icd10.ts` | ICD-10 code list. `searchICD10(query)`, `findByCode(code)`, `mondoForIcd10(code)`, `icd10ToCoded(entry)`. |
| `organSystems.ts` | Organ system list. `organSystemToCoded(s)` → `CodedValue`. |
| `codeSystems.ts` | URI constants for SNOMED CT, LOINC, FHIR, etc. |
| `supervision.ts` | Supervision level options (direct, indirect, independent). |
| `specialties.ts` | Medical specialty list for medicine placements. |
| `levelOfCare.ts` | ICU level-of-care options. |
| `outcomes.ts` | Procedure outcome options (success, partial, failed, abandoned). |
| `procedures.ts` | Procedure type list. |
| `airwayItems.ts` | Airway equipment/technique options. |
| `arterialLineSites.ts` | Arterial line insertion site options. |
| `cvcSites.ts` | CVC insertion site options. |
| `ussStudyTypes.ts` | Ultrasound study type options. |
| `regionalBlocks.ts` | Regional anaesthesia block type options. |

---

## 9. Components (`src/components/`)

All are pure presentational components with no store dependencies.

| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Styled touchable — variants: primary, secondary, danger. |
| `Card.tsx` | Rounded container with shadow. Used heavily in Settings + Competency screens. |
| `DateField.tsx` | Text input that validates/formats YYYY-MM-DD. `fmt(date)` / `parse(s)` helpers. |
| `DomainBar.tsx` | Horizontal progress bar for COBATRICE domain visualisation. |
| `EmptyState.tsx` | Centred icon + message for empty lists. |
| `FormField.tsx` | Label + TextInput wrapper with error display. |
| `ICD10Autocomplete.tsx` | Debounced search input that calls `searchICD10()` / `findByCode()`. Dropdown results. |
| `MultiSelect.tsx` | Chip-based multi-select (organ systems, COBATRICE domains). `toggle(item)` handler. |
| `NetworkBanner.tsx` | Banner shown when `isOnline === false`. |
| `PasswordStrengthMeter.tsx` | Visual strength bar. `scorePassword(pw)` → 0–4. Used in Register + ChangePassword. |
| `RadioGroup.tsx` | Single-select radio button group. |
| `StatCard.tsx` | Metric card (number + label) for Dashboard. |
| `UserPicker.tsx` | Searchable user list from `getUserDirectory()`. Used for supervisor/observer selection. |

---

## 10. Utilities (`src/utils/`)

| File | Exports |
|------|---------|
| `dateUtils.ts` | `todayISO()`, `nowISO()`, `formatDisplay(iso)`, `formatDateTime(iso)`, `startOfMonthISO()`, `isValidDateString(s)` |
| `uuid.ts` | `generateUUID()` — uses `expo-crypto` for cryptographically random UUIDs |

### `src/polyfills/crypto.ts`
Patches `globalThis.crypto` with `expo-crypto` so Supabase PKCE S256 challenge works on the Hermes JS engine.

---

## 11. Supabase Backend

### Database tables (Postgres)

| Table | Key columns | RLS |
|-------|------------|-----|
| `auth.users` | Managed by Supabase | — |
| `profiles` | `id` (FK auth.users), `email`, `display_name`, `role` (`user`/`admin`), `disabled`, `country`, `med_reg_hmac`, `med_reg_set_at` | Select: own row + admins. Update: own row (guards on role/disabled). Insert: via trigger only. |
| `case_logs` | All `CaseLog` fields + `server_updated_at`, `deleted_at` | Select/Insert/Update/Delete: owner or admin. Supervisor read via supervisor_user_id. |
| `procedure_logs` | All `ProcedureLog` fields + sync fields | Same as case_logs |
| `ward_review_logs` | WardReviewLog fields | 4 RLS policies (select/insert/update/delete) |
| `transfer_logs` | TransferLog fields | Same |
| `ed_attendance_logs` | EDAttendanceLog fields | Same |
| `medicine_placement_logs` | MedicinePlacementLog fields | Same |
| `airway_logs` | AirwayLog fields | Same |
| `arterial_line_logs` | ArterialLineLog fields | Same |
| `cvc_logs` | CVCLog fields | Same |
| `uss_logs` | USSLog fields | Same |
| `regional_block_logs` | RegionalBlockLog fields | Same |
| `audit_log` | Append-only triggers on case + procedure changes | Admin: all rows. User: own rows only. |
| `app_settings` | Key/value — not synced to Supabase | — |

**Key DB functions:**
- `is_admin(uid)` — used in all RLS policies
- `fn_profiles_on_auth_insert()` — trigger: creates profile row when auth.users row is created
- `fn_profiles_before_update()` — trigger: guards immutable fields on profiles
- `bump_server_updated_at()` — trigger on all clinical tables: sets `server_updated_at = now()` on every update
- `guard_approval_columns()` — trigger: prevents non-supervisors from setting approval fields

### Supabase Migrations (applied in order)

| File | Description |
|------|-------------|
| `20260420000000_profiles.sql` | `profiles` table, `fn_profiles_on_auth_insert` trigger, RLS |
| `20260420000001_audit_log.sql` | `audit_log` table + triggers on case/procedure logs |
| `20260420000002_rls_clinical_tables.sql` | RLS on `case_logs` + `procedure_logs`, `guard_approval_columns` trigger |
| `20260424000003_case_logs_parity_columns.sql` | Additional columns on `case_logs` for UI parity |
| `20260424000004_new_clinical_tables.sql` | 9 new clinical tables (ward_review, transfer, ed_attendance, medicine_placement, airway, arterial_line, cvc, uss, regional_block) |
| `20260424000005_rls_new_clinical_tables.sql` | 36 RLS policies (4 × 9 tables) + `bump_server_updated_at` + `guard_approval_columns` on all 9 new tables |

### Edge Functions (`supabase/functions/`)

#### `register/index.ts` — Deploy: `--no-verify-jwt`
Public signup. No auth required.
1. Validates: `email`, `displayName`, `password`, `country` (ISO 3166-1 alpha-2), `med_reg_number`
2. Creates auth user via service role (`sb.auth.admin.createUser`)
3. Computes `HMAC-SHA256(normalise(med_reg_number), MED_REG_PEPPER)` → hex string
4. Upserts `profiles` row with `country` + `med_reg_hmac`
5. Rolls back auth user if profile write fails
6. Returns `{ ok: true, needsEmailConfirmation: boolean }`

**Normalise:** `trim().toUpperCase().replace(/\s+/g, '')`

#### `set-registration/index.ts` — Deploy: with JWT verification (default)
For Google OAuth users who skipped `register`. Called by `CompleteRegistrationScreen` after sign-in.
1. Verifies `Authorization: Bearer <token>` JWT
2. Validates `country` + `med_reg_number` from body
3. Computes same HMAC with same pepper
4. Updates `profiles` row for the authenticated user's `id`
5. Returns `{ ok: true }`

#### `validate-registration/index.ts` — Deploy: `--no-verify-jwt`
For training bodies / authorised validators.
1. Checks `X-Validator-Secret` header (constant-time comparison via `safeCompare`)
2. Computes HMAC of submitted `med_reg_number`
3. Queries `profiles` by `med_reg_hmac`
4. Returns `{ found: boolean, country?, registered_at? }` — no PII ever returned

#### `admin-users/index.ts` — Deploy: `--no-verify-jwt`
Admin operations on auth users. Verifies internally that caller JWT has `app_metadata.role = 'admin'`.
Actions: `listUsers`, `createUser`, `updateRole`, `setDisabled`, `resetPassword`, `deleteUser`

### Required secrets
```
MED_REG_PEPPER         — HMAC key. Set once, never rotate. Changing breaks all existing hashes.
VALIDATOR_SECRET       — Shared with authorised training body validators only.
SUPABASE_SERVICE_ROLE_KEY  — Auto-available in Deno runtime.
SUPABASE_ANON_KEY          — Auto-available in Deno runtime.
SUPABASE_URL               — Auto-available in Deno runtime.
```

---

## 12. Security & Privacy

- **Medical reg numbers:** Never stored as plaintext. `HMAC-SHA256(normalise(number), MED_REG_PEPPER)` stored in `profiles.med_reg_hmac`. Deterministic (enables validation lookup), not reversible without the pepper.
- **RLS:** All clinical tables have row-level security. Users can only read/write their own rows. Postgres enforces this server-side — a hand-crafted Supabase client cannot bypass it.
- **profileComplete:** Client resolves as `!!profiles.country && (med_reg_hmac IS NOT NULL)` — the HMAC value itself is never sent to the client.
- **SecureStore:** JWT session stored in chunked `expo-secure-store` (encrypted on-device).
- **PKCE:** OAuth flow uses S256 challenge — no implicit grant, no token in URL.
- **iOS export compliance:** `ITSAppUsesNonExemptEncryption = false` in `Info.plist` — app uses only standard HTTPS/TLS, no custom encryption.

---

## 13. Key Data Flows

### New user registration (email/password)
```
RegisterScreen
  → supabase.functions.invoke('register', { displayName, email, password, country, med_reg_number })
  → Edge Function: createUser (service role) + HMAC hash + upsert profile
  → { ok, needsEmailConfirmation }
  → if needsEmailConfirmation: show Alert, navigate to Login
  → user clicks email link → navigates to app → Login
```

### Google OAuth first login
```
LoginScreen → authStore.signInWithGoogle()
  → expo-auth-session PKCE → Google → iculogbook://auth-callback
  → supabase.auth.exchangeCodeForSession()
  → authStore.apply(user) — profileComplete = false (no med_reg_hmac yet)
  → RootNavigator: renders CompleteRegistrationScreen
  → user submits country + medRegNumber
  → authStore.completeRegistration() → set-registration Edge Function (JWT auth)
  → profileComplete = true → RootNavigator: renders Main tabs
```

### Offline write + sync
```
User creates case
  → CaseService.create() → INSERT into SQLite (synced=0)
  → caseStore.triggerSync() → SyncService.syncPending()
  → if isOfflineOnly: return
  → if offline (networkStore): return
  → push: upsert rows where synced=0 → Supabase
  → pull: fetch rows where server_updated_at > lastWatermark → SQLite INSERT OR REPLACE
  → if local row has unsynced edits: set conflict=1
```

### Export flow
```
SettingsScreen → handleExport()
  → ExportScreen → user selects format
  → ARCPExporter.generate() → reads all 10 log types from SQLite → CSV string
  → Share sheet (expo-sharing) or save to device
```

---

## 14. Build & CI

### EAS Profiles
| Profile | Platform | Output | Distribution |
|---------|---------|--------|-------------|
| `development` | Both | Dev client APK | Internal (testers only) |
| `preview` | Android | APK | Internal |
| `production` | iOS | IPA | App Store |
| `production` | Android | AAB | Play Store |

### Android signing
Reads from `~/.gradle/gradle.properties` (never committed):
```
ICULOGBOOK_STORE_FILE=<path to release.keystore>
ICULOGBOOK_STORE_PASSWORD=…
ICULOGBOOK_KEY_ALIAS=iculogbook
ICULOGBOOK_KEY_PASSWORD=…
```

### GitHub Actions secrets required
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_TOKEN` (from `eas token:create`)

---

## 15. Companion Documents

| File | Purpose |
|------|---------|
| `SETUP.md` | Full setup guide — migrations, Edge Function deploy, secrets, Google OAuth config, first admin, build commands |
| `APP_STORE_SUBMISSION.md` | 66-item checklist: Apple + Google accounts, signing, metadata, screenshots, privacy labels, CI |
| `PRODUCTION_TODO.md` | Short LLM-friendly summary of done / must-do / should-do / known issues |
| `README.md` | User-facing project overview, feature list, architecture decisions, glossary |
