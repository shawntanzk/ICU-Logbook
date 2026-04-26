# ICU Logbook

A cross-platform clinical logbook for ICU and anaesthesia trainees — log cases, procedures, ward reviews, transfers, and more. Works **fully offline without an account**. Sign in at any time to enable cloud sync and access your data across devices and the companion web app.

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [Who Is It For?](#2-who-is-it-for)
3. [Features](#3-features)
4. [Tech Stack](#4-tech-stack)
5. [Project Structure](#5-project-structure)
6. [Installation](#6-installation)
7. [Running the App](#7-running-the-app)
8. [Using the App](#8-using-the-app)
9. [Security & Privacy](#9-security--privacy)
10. [FAIR Semantic Data Product](#10-fair-semantic-data-product)
11. [Architecture Decisions](#11-architecture-decisions)
12. [Extending the App](#12-extending-the-app)
13. [App Store Submission](#13-app-store-submission)
14. [Troubleshooting](#14-troubleshooting)
15. [Glossary](#15-glossary)

---

## 1. What Is This App?

ICU Logbook replaces paper-based clinical logbooks for doctors training in Intensive Care Medicine and Anaesthesia. Trainees log every case they manage and every procedure they perform. The app maps entries to the **CoBaTrICE framework** and generates a real-time portfolio covering all ARCP evidence domains.

**No account required to start.** Tap "Continue without account" on the login screen to use the app fully offline. All data is stored on-device in SQLite. Create or sign in to an account later to sync to the cloud and access the companion web app.

---

## 2. Who Is It For?

| Role | What they can do |
|---|---|
| **Guest (offline)** | Full app access with no account. Data stays on-device only. Can sign in later to migrate data to an account. |
| **User** (trainee / fellow / registrar) | Logs their own cases, procedures, and clinical episodes. Sees anything they own *or* where they are listed as supervisor / observer. Writes reflections, tracks competency. Syncs with the cloud and web app. |
| **Admin** | Everything above, plus: sees every record in the system regardless of owner, and manages users from the Admin Panel (role toggle, disable, password reset, delete). |

Supervision and observation are recorded **per record** via user pickers — not as account-level roles. A user can supervise one case and be supervised on another.

---

## 3. Features

### Offline Guest Mode
- **No account needed** — tap "Continue without account" on the Login screen
- All 10 entry types, the dashboard, competency map, and export features work fully offline
- A stable local UUID is generated and used as the owner identifier for all offline data
- **Seamless sign-in migration** — sign in or create an account at any time; all offline data is re-attributed to the new account and queued for upload automatically
- **Settings → Offline mode card** — shows account status and a "Sign in to sync" button

### Registration & Auth
- **Self-registration** — dedicated RegisterScreen collects name, email, password, country (195 ISO countries), and medical registration number
- **Medical reg number encryption** — HMAC-SHA256 hashed on the server; the plaintext never touches the database; not even administrators can read it
- **Email + password sign-in** with password strength meter and forgot-password flow
- **Google OAuth** via PKCE + in-app browser. Google users are directed to `CompleteRegistrationScreen` to supply their country + reg number before reaching the app
- **Terms gate** — versioned Terms & Privacy screen shown between login and the main app; re-accepted on version bumps

### Clinical Log Entry (10 entry types)
- **ICU / HDU Cases** — date, diagnosis, ICD-10, organ systems, CoBaTrICE domains, supervision level, patient demographics, level of care, involvement, cardiac arrest flag, outcome, relative communication, teaching delivered, reflection
- **Ward Reviews** — ward, primary reason, patient demographics, outcome
- **ED Attendances** — presentation, triage category, outcome
- **Transfers** — origin/destination, clinical indication, team composition
- **Medicine Placements** — specialty, duration, learning objectives
- **Airway Management** — device, grade, technique, intubation success
- **Arterial Lines** — site, approach, attempts, success
- **Central Venous Catheters (CVC)** — site, side, approach, attempts, success
- **Ultrasound Studies** — type, findings, real-time guidance
- **Regional Blocks** — block type, technique, nerve stimulator, success

All entry types share: date, supervisor user picker, external supervisor name, supervisor approval state, sync bookkeeping columns, schema version, JSONB coded fields, consent status, license.

### Log Hub
A central hub screen (Log tab) lets users pick any of the 10 entry types from a categorised list. Quick-add chips for the most common procedure types.

### Case List & Detail
- Searchable, filterable list of cases with owner badge and "You supervised / You observed" relation pills
- Full case detail with supervisor/observer display names resolved, linked procedures, approval state, sync status
- **Approve / Revoke approval** available to users listed as supervisor on a case

### Procedures Tab
- Filterable list of all procedure types (airway, arterial line, CVC, USS, regional block)
- Success rate and type-count statistics

### Dashboard
- Stat cards: total cases, cases this month, procedures logged, success rate, domains covered
- Specialty breakdown, level of care distribution, mortality stats, USS and regional block counts
- Competency Map — 3×4 dot grid across all 12 CoBaTrICE domains, colour-coded by case count

### Export
- **ARCP Portfolio CSV** — single multi-section CSV covering all 10 log types, ARCP/FICM-field aligned
- **HL7 FHIR R4 Bundle** — Encounter + Condition + Observation + Provenance per case
- **openEHR Composition**
- **JSON-LD 1.1** — joinable with SNOMED/ICD-10-coded datasets

### Sync & Offline
- **Offline-first** — all writes go to SQLite immediately; the app is always usable without internet
- **Offline guest mode** — full app without any account; data never leaves the device unless you sign in
- **Offline-only mode toggle** (Settings) — prevents all network calls even when logged in
- Two-way Supabase sync on every write and on demand (Settings → Sync Now)
- Conflict detection: remote-updated + local-unsynced rows flagged; resolve in Settings → Sync Conflicts
- Real-time sync via Supabase Realtime available in the companion web app

### Web App
A companion Next.js web app connects to the same Supabase backend. All data created on mobile syncs automatically to the web app. Features optional auto-sync via Supabase Realtime. See the `webapp/` directory.

### Settings
- Offline mode card (guest) or Cloud Sync panel (logged-in users)
- Change password, Data Sharing & Consent, Export, Admin Panel, Sync Conflicts, Sign Out
- **Admin Panel** — list all users, toggle role, disable/re-enable, reset password, delete

### Security
- Medical registration number: HMAC-SHA256 with a secret pepper (server-only); irreversible
- Standalone **validator tool** (`docs/validator.html`) for training bodies
- RLS on all Supabase tables (36 policies across 11 tables)
- iOS export compliance pre-declared (`ITSAppUsesNonExemptEncryption = false`)
- WebCrypto polyfill ensures Supabase uses PKCE S256 on Hermes

---

## 4. Tech Stack

### Mobile App

| Technology | What it does |
|---|---|
| **React Native / Expo SDK 52** | Native iOS & Android UI from one codebase |
| **TypeScript (strict)** | Type safety across the entire codebase |
| **expo-sqlite** | Local offline-first database (WAL mode) |
| **Zustand** | Lightweight reactive state management |
| **Zod** | Runtime schema validation |
| **React Navigation v6** | Bottom tabs + native stacks |
| **Supabase JS** | Cloud auth + Postgres + RLS client |
| **EAS (Expo Application Services)** | Cloud builds + store submission |
| **expo-crypto** | UUID generation + WebCrypto polyfill |
| **dayjs** | Date formatting |

### Backend

| Technology | What it does |
|---|---|
| **Supabase** | Postgres + Auth + RLS + Realtime + Edge Functions |
| **Deno (Edge Functions)** | Server-side registration hashing, admin ops, validator |

### Web App

| Technology | What it does |
|---|---|
| **Next.js 14 (App Router)** | Web UI with server-side rendering |
| **@supabase/ssr** | Server + browser Supabase clients, auth cookies |
| **Zustand** | Shared state (same pattern as mobile) |
| **Supabase Realtime** | Auto-sync across tabs and devices |

---

## 5. Project Structure

```
ICU-Logbook/
├── App.tsx                         Entry point — DB init, store hydration, navigator
├── index.js                        Registers root; imports crypto polyfill first
├── app.json                        Expo project config (bundle IDs, icons, privacy manifests)
├── eas.json                        EAS build profiles: development / preview / production
├── babel.config.js
├── tsconfig.json
│
├── src/
│   ├── data/
│   │   ├── countries.ts            195 ISO 3166-1 countries
│   │   ├── icd10.ts                Curated ICU ICD-10 codes
│   │   └── …
│   │
│   ├── models/                     TypeScript types + Zod schemas
│   │   ├── CaseLog.ts
│   │   ├── ProcedureLog.ts
│   │   ├── AirwayLog.ts
│   │   ├── ArterialLineLog.ts
│   │   ├── CVCLog.ts
│   │   ├── USSLog.ts
│   │   ├── RegionalBlockLog.ts
│   │   ├── WardReviewLog.ts
│   │   ├── TransferLog.ts
│   │   ├── EDLog.ts
│   │   └── MedicinePlacementLog.ts
│   │
│   ├── database/
│   │   ├── client.native.ts        Opens icu_logbook.db; wipeLocalData(); reAttributeLocalData()
│   │   ├── client.web.ts           Web stub (no-op)
│   │   └── migrations.ts           v1–v10 local schema migrations (additive only)
│   │
│   ├── services/
│   │   ├── supabase.ts             Supabase client (SecureStore session, PKCE)
│   │   ├── AuthService.ts          Auth + profile (country, profileComplete flag)
│   │   ├── AuthScope.ts            Owner-scoped SQL WHERE fragments
│   │   ├── authState.ts            Shared auth ref (breaks store↔scope cycle)
│   │   ├── CaseService.ts          CRUD + soft-delete
│   │   ├── ProcedureService.ts
│   │   ├── AirwayService.ts
│   │   ├── ArterialLineService.ts
│   │   ├── CVCService.ts
│   │   ├── USSService.ts
│   │   ├── RegionalBlockService.ts
│   │   ├── WardReviewService.ts
│   │   ├── TransferService.ts
│   │   ├── EDService.ts
│   │   ├── MedicinePlacementService.ts
│   │   ├── SyncService.ts          Two-way sync + conflict tracking (skipped in guest mode)
│   │   ├── QualityService.ts       Completeness + coding confidence scores
│   │   ├── SettingsService.ts
│   │   ├── secureStorage.ts        Chunked expo-secure-store adapter
│   │   ├── errorReporting.ts       Sentry-ready reporter
│   │   └── export/
│   │       ├── ARCPExporter.ts
│   │       ├── FHIRExporter.ts
│   │       ├── OpenEHRExporter.ts
│   │       ├── JSONLDExporter.ts
│   │       └── index.ts
│   │
│   ├── store/
│   │   ├── authStore.ts            Session, role, country, profileComplete; guest migration on login
│   │   ├── guestStore.ts           Offline guest mode — localUserId, enterGuestMode(), exitGuestMode()
│   │   ├── caseStore.ts
│   │   ├── procedureStore.ts
│   │   ├── consentStore.ts
│   │   ├── offlineStore.ts         Offline-only toggle (prevents all network calls)
│   │   ├── networkStore.ts         Live connectivity state (NetInfo)
│   │   ├── termsStore.ts
│   │   └── syncStore.ts
│   │
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── FormField.tsx
│   │   ├── SelectField.tsx         Modal single-select dropdown
│   │   ├── ToggleField.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── UserPicker.tsx
│   │   ├── PasswordStrengthMeter.tsx
│   │   ├── NetworkBanner.tsx
│   │   └── …
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx             Sign in + Google OAuth + forgot password + Continue offline
│   │   ├── RegisterScreen.tsx
│   │   ├── CompleteRegistrationScreen.tsx
│   │   ├── TermsScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── CompetencyScreen.tsx
│   │   ├── CaseListScreen.tsx
│   │   ├── CaseDetailScreen.tsx
│   │   ├── AddCaseScreen.tsx
│   │   ├── EditCaseScreen.tsx
│   │   ├── LogHubScreen.tsx
│   │   ├── AddWardReviewScreen.tsx
│   │   ├── AddTransferScreen.tsx
│   │   ├── AddEDScreen.tsx
│   │   ├── AddMedicinePlacementScreen.tsx
│   │   ├── AddAirwayScreen.tsx
│   │   ├── AddArterialLineScreen.tsx
│   │   ├── AddCVCScreen.tsx
│   │   ├── AddUSSScreen.tsx
│   │   ├── AddRegionalBlockScreen.tsx
│   │   ├── ProcedureListScreen.tsx
│   │   ├── AddProcedureScreen.tsx
│   │   ├── EditProcedureScreen.tsx
│   │   ├── SettingsScreen.tsx          Guest-aware: shows offline banner or full sync panel
│   │   ├── ConsentScreen.tsx
│   │   ├── ExportScreen.tsx
│   │   ├── AdminPanelScreen.tsx
│   │   ├── ChangePasswordScreen.tsx
│   │   └── ConflictsScreen.tsx
│   │
│   ├── navigation/
│   │   ├── types.ts
│   │   └── RootNavigator.tsx       Auth gate → Terms gate → Profile gate → Main tabs
│   │                               Guest mode bypasses all three gates directly to Main
│   │
│   ├── polyfills/
│   │   └── crypto.ts               WebCrypto polyfill for Supabase PKCE on Hermes
│   │
│   └── utils/
│       ├── constants.ts
│       ├── dateUtils.ts
│       └── uuid.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260420000000_profiles.sql
│   │   ├── 20260420000001_audit_log.sql
│   │   ├── 20260420000002_rls_clinical_tables.sql
│   │   ├── 20260424000003_case_logs_parity_columns.sql
│   │   ├── 20260424000004_new_clinical_tables.sql
│   │   ├── 20260424000005_rls_new_clinical_tables.sql
│   │   └── 20260424000006_profiles_registration_fields.sql
│   └── functions/
│       ├── admin-users/
│       ├── register/
│       ├── set-registration/
│       └── validate-registration/
│
├── webapp/                         Next.js companion web app (same Supabase backend)
│   ├── src/
│   │   ├── app/                    Next.js App Router pages
│   │   ├── components/             Shared UI components
│   │   ├── lib/supabase/           Server + browser Supabase clients
│   │   ├── store/                  Zustand stores (appStore, caseStore, etc.)
│   │   └── hooks/useRealtime.ts    Supabase Realtime subscription for auto-sync
│   └── …
│
├── assets/
│   ├── icon.svg                    Source icon (1024×1024, dark navy + ECG line)
│   ├── icon.png                    Generated — used by Expo / iOS App Store
│   ├── adaptive-icon.svg           Android adaptive icon source
│   ├── adaptive-icon.png           Generated — Android adaptive icon foreground
│   ├── splash.svg                  Splash screen source
│   ├── splash.png                  Generated — launch screen
│   └── schema/                     JSON-LD context, OWL ontology, SHACL shapes, DCAT catalog
│
├── scripts/
│   └── generate-assets.mjs        Converts SVG sources → PNG assets (requires sharp)
│
├── docs/
│   ├── privacy-policy.html
│   └── validator.html
│
├── android/                        Bare workflow native Android project
├── ios/                            Bare workflow native iOS project
│
├── APP_STORE_SUBMISSION.md
├── PRODUCTION_TODO.md
├── SETUP.md
└── README.md
```

---

## 6. Installation

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **EAS CLI** — `npm install -g eas-cli`
- **iOS builds locally**: Xcode 15+ on Mac
- **Android builds locally**: Android Studio + Android SDK (set `ANDROID_HOME`)
- A **Supabase project** with migrations applied — see [SETUP.md](SETUP.md)

### Steps

```bash
# 1. Clone
git clone https://github.com/your-org/ICU-Logbook.git
cd ICU-Logbook

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env:
#   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### Android SDK environment (macOS)

Add to `~/.zshrc` if you have Android Studio installed:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then `source ~/.zshrc`.

### Generate app icon & splash assets (first time only)

```bash
npm install --save-dev sharp
node scripts/generate-assets.mjs
```

This converts the SVG sources in `assets/` into the PNGs Expo needs.

---

## 7. Running the App

### Local development (recommended for testing)

```bash
# iOS Simulator (Mac + Xcode required)
npx expo run:ios

# Android Emulator (Android Studio + emulator running)
npx expo run:android
```

> **Note:** This is a **bare workflow** app. Expo Go is not supported. `expo run:*` compiles native code and installs the app directly on the simulator/emulator.

The first build takes several minutes to compile native modules. Subsequent builds are fast.

### Cloud builds via EAS (no local SDK required)

```bash
# Android APK (for testing — installs on any Android device)
eas build --platform android --profile preview

# iOS (requires Apple Developer account)
eas build --platform ios --profile preview

# Production builds for store submission
eas build --platform all --profile production
```

### Web app

```bash
cd webapp
npm install
npm run dev   # http://localhost:3000
```

---

## 8. Using the App

### Starting without an account (offline mode)

Tap **Continue without account** at the bottom of the Login screen. You are taken straight to the main app. All 10 entry types, the dashboard, and export work fully offline.

- A stable UUID is generated locally and used as the owner identifier for all data
- Nothing ever leaves the device while you are in guest mode
- **Settings** shows an "Offline mode" card with a "Sign in to sync" button

### Creating an account

Tap **Create an Account** on the Login screen. The RegisterScreen collects:

1. **Full name**
2. **Email**
3. **Password** (minimum 8 characters; strength meter shown inline)
4. **Confirm password**
5. **Country** (searchable dropdown, 195 countries)
6. **Medical registration number** — submitted to the server over HTTPS, immediately hashed with HMAC-SHA256, stored as a 64-character hex digest. The original number is never written to the database.
7. **Terms agreement**

### Migrating offline data to an account

If you used the app in guest mode and then sign in or create an account, all data created offline is automatically re-attributed to your account and queued for upload on the next sync. Nothing is lost.

### Navigation gate order

```
No account + no guest mode  →  Login / Register
Guest mode                  →  Main app (all gates bypassed)
Logged in                   →  Terms & Privacy (if not yet accepted for this version)
                            →  Complete Registration (if country + reg number not set)
                            →  Main app (5 tabs)
```

### Logging a case

1. Tap the **Log** tab → **ICU / HDU Case**
2. Fill the form — red asterisk = required
3. Tap **Save**

Or: **Cases** tab → `+` (header) to jump straight to Add Case.

### Supervisor approval

Name someone as supervisor on any entry → they see it in their lists with "You supervised". They can tap **Approve** on the detail screen. Admins can approve any record.

### Exporting your portfolio

**Settings → Export → ARCP Portfolio (CSV)** — multi-section CSV covering all 10 log types, ready for Excel or your training programme. FHIR, openEHR, and JSON-LD also available.

### Who sees what

| Account | Sees |
|---|---|
| **Guest** | Records owned by the local device UUID |
| **User** | Records they own + records where they are named supervisor or observer |
| **Admin** | Every record across all users |

Enforced at both the local SQLite layer (WHERE fragments) and Postgres RLS simultaneously.

### Admin tasks

**Settings → Admin Panel** — lists all accounts. Actions: toggle role, disable/re-enable, send password reset email, delete user.

---

## 9. Security & Privacy

### Medical registration number

The registration number travels over HTTPS to the `register` (or `set-registration`) Supabase Edge Function. The function:

1. Normalises: `UPPER(STRIP_WHITESPACE(number))`
2. Computes `HMAC-SHA256(normalised, MED_REG_PEPPER)` — a 256-bit secret stored only in the Edge Function environment
3. Stores the 64-character hex digest in `profiles.med_reg_hmac`

The digest is deterministic, so the **validator tool** (`docs/validator.html`) can verify a number without seeing the original. The pepper means a full database dump cannot be brute-forced without it.

**Important:** `MED_REG_PEPPER` must not change after users have registered.

### Guest mode privacy

In guest mode, no data is ever sent to any server. The local UUID is stored only in AsyncStorage on the device. If the app is uninstalled, all data is erased.

### Row-level security

All 11 Supabase tables have RLS enabled. Users can only read/write their own records. Supervisor/observer users can read (not edit) records where they appear.

### Encryption in transit

All client↔Supabase traffic uses TLS 1.2+. The app pre-declares `ITSAppUsesNonExemptEncryption = false` — standard HTTPS only.

### Local data

SQLite lives in the app sandbox. Auth tokens are stored in Expo SecureStore (iOS Keychain / Android Keystore).

### Data-sharing consent

Four levels (Private / Anonymous / Research / Commercial). Consent is recorded per-user and attached to each export.

---

## 10. FAIR Semantic Data Product

> Relevant if you are integrating with biomedical knowledge graphs. Skip if you only need logbook features.

### Terminology bindings

| Concept | Primary binding | OBO mapping |
|---|---|---|
| Diagnosis | ICD-10 + SNOMED CT | MONDO |
| Organ system | SNOMED CT | UBERON |
| CoBaTrICE domain | `w3id.org/iculogbook/cobatrice/<id>` | — |
| Supervision level | Ottawa EPA entrustment scale | — |
| Procedure | SNOMED CT | NCIT (planned) |

### Export formats

| Format | What it produces |
|---|---|
| ARCP Portfolio CSV | All 10 log types in a single multi-section file |
| HL7 FHIR R4 Bundle | Encounter + Condition + Observation + Provenance |
| openEHR Composition | EVALUATION + OBSERVATION entries |
| JSON-LD 1.1 | RDF-parseable; OBO/Biolink IRIs in `@context` |

### Schema assets

`assets/schema/` — JSON-LD context, OWL ontology, SHACL shapes, and DCAT catalog.

---

## 11. Architecture Decisions

### Why offline guest mode with a local UUID?

Users in clinical training often work in environments with poor connectivity and need to start logging immediately — account creation is a barrier when you have 30 seconds between patients. A local UUID gives guest data a stable owner identity so:

1. `AuthScope` works identically for guests and logged-in users — no special-casing in services
2. When the user signs in later, a single SQL transaction re-attributes all rows (`UPDATE ... SET owner_id = supabaseId WHERE owner_id = localId`) and marks them `synced = 0` for upload. No data is lost.
3. The UUID is persisted across app restarts so a user who closes and reopens the app in guest mode sees their previous data.

### Why skip Terms and Profile gates in guest mode?

Terms acceptance is stored per-account in Supabase. A guest has no account, so there is nothing to accept against. The profile (country + reg number) requires the Edge Function, which requires an account. Both gates are meaningless for guests and would block the user for no reason. When the guest eventually creates an account those gates run as normal.

### Why a dedicated RegisterScreen instead of inline sign-up?

The registration form collects 7 fields. A separate screen lets it scroll freely and makes the sign-in path fast. It also makes adding future registration steps (training programme, speciality) trivial without touching the login flow.

### Why hash the medical reg number instead of encrypting it?

Validation only needs a yes/no answer. HMAC-SHA256 with a server-side pepper is sufficient and simpler — no key management, no decryption path, no key rotation complexity. Even with full DB access you cannot reverse the hash without the pepper.

### Why route signup through an Edge Function?

`supabase.auth.signUp()` from the client leaves a window where the auth user exists but has no profile. If the profile write fails, the account is broken. The `register` Edge Function creates the auth user, computes the HMAC, and writes the profile atomically.

### Why SQLite instead of WatermelonDB?

`expo-sqlite` with manual SQL is simpler to audit and sufficient for a single trainee's logbook volumes. The `IDataService` abstraction means swapping storage backends touches only the service layer.

### Why a separate `authState.ts` module?

`AuthScope` needs the current userId to build WHERE fragments, but importing from `authStore` creates a circular dependency (`store → service → scope → store`). `authState.ts` is a plain shared reference that breaks the cycle. Guest mode uses the same pattern — `enterGuestMode()` writes the localUserId into `authState` so all services work identically.

---

## 12. Extending the App

### Adding a new entry type

1. Create `src/models/YourLog.ts` — TypeScript type + Zod schema
2. Create `src/services/YourService.ts` — CRUD + soft-delete
3. Add a Supabase migration for the cloud table + RLS policies
4. Mirror in `src/database/migrations.ts` with additive `ALTER TABLE ADD COLUMN`
5. Create `src/screens/AddYourScreen.tsx`
6. Add to `LogStackParamList` in `src/navigation/types.ts`
7. Add the screen to `LogNavigator` in `RootNavigator.tsx`
8. Add a tile to `LogHubScreen.tsx`
9. Add a section to `src/services/export/ARCPExporter.ts`
10. Add the table to `OWNED_TABLES` in `src/database/client.native.ts` so guest data migrates correctly

### Adding a new ICD-10 code

Append to `ICD10_CODES` in `src/data/icd10.ts`. No other wiring needed.

### Supabase schema changes

Write a new migration file in `supabase/migrations/` (timestamp prefix). Apply it:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

Always mirror cloud changes in `src/database/migrations.ts`.

---

## 13. App Store Submission

See **[APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md)** for the full 66-item checklist covering:
- Apple Developer account + App Store Connect setup
- iOS code signing, screenshots, privacy nutrition labels
- Android keystore, Play App Signing, Data Safety form
- EAS build commands for both platforms
- Supabase secrets to set before launch

---

## 14. Troubleshooting

### `npm install` fails
Delete `node_modules/` and `package-lock.json`, then re-run. Check `node --version` ≥ 20.

### App shows "Initialising…" indefinitely
Database migration failed. Check available device storage. Erase the simulator and try again.

### `SDK location not found` when running `expo run:android`
Set `ANDROID_HOME` in your shell profile — see [Installation](#6-installation).

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE` when installing on emulator
An old version of the app is on the emulator with a different signing key. Uninstall it first:
```bash
adb uninstall com.iculogbook.app
npx expo run:android
```

### Android Compatibility dialog about 16KB page alignment
This is a warning, not an error — tap OK or "Don't Show Again". The app runs in compatibility mode. The unaligned `.so` files come from npm packages (Hermes, React Native); the fix requires package maintainers to ship recompiled binaries. Newer SDKs resolve this progressively.

### EAS build fails: "autolinking.gradle does not exist"
Expo SDK 53+ removed `autolinking.gradle`. If you see this, the `expo` version in `package.json` does not match the native files. Ensure `expo` is pinned to `~52.0.0` and push all changes before triggering a build.

### "I can't see my cases" after signing in
Visibility is owner-scoped. Sign in as the account that created the cases, or use an admin account. If you were in guest mode and then created a **new** account, your guest data migrated to that account — sign in to that account to see it.

### Registration fails with "Server misconfiguration"
`MED_REG_PEPPER` has not been set on the Supabase project:
```bash
supabase secrets set MED_REG_PEPPER=$(openssl rand -hex 32)
supabase functions deploy register --no-verify-jwt
```

### Want to wipe everything and start over
Erase the simulator or uninstall the app (removes local SQLite). Delete the user from Supabase Auth → Users. On next launch you'll see the Login screen.

### Expo Go doesn't work
This is a bare workflow app — Expo Go is not compatible. Use `npx expo run:ios` or `npx expo run:android` instead.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **ARCP** | Annual Review of Competence Progression — annual portfolio review for UK specialty trainees |
| **CoBaTrICE** | Competency Based Training in Intensive Care Medicine for Europe — 12-domain framework |
| **ICD-10** | International Classification of Diseases, 10th revision |
| **Ottawa EPA** | Entrustable Professional Activity scale — levels of supervision/entrustment |
| **HMAC-SHA256** | Hash-based Message Authentication Code — a keyed one-way hash used to store the medical registration number irreversibly |
| **Pepper** | A server-side secret mixed into a hash to prevent rainbow-table attacks |
| **RLS** | Row-Level Security — Postgres feature enforcing per-row access at the database layer |
| **PKCE** | Proof Key for Code Exchange — OAuth extension preventing auth-code interception on mobile |
| **EAS** | Expo Application Services — cloud build and submission tooling |
| **Offline-first** | Data is saved locally before any network call; the app is always usable without internet |
| **Guest mode** | Using the app without an account; data stored locally with a stable device UUID |
| **Local UUID** | A randomly generated identifier stored on-device, used as owner_id for all guest data |
| **Re-attribution** | SQL transaction that reassigns guest rows from localUserId to supabaseId on sign-in |
| **SQLite** | File-based local database stored in the app sandbox |
| **Supabase** | Open-source Firebase alternative — Postgres + Auth + Storage + Edge Functions |
| **Zustand** | Lightweight React state management |
| **Zod** | TypeScript-first runtime schema validation |
| **Migration** | A versioned script that updates the database schema without losing existing data |
| **Sync flag** | `synced` column on every local row — `0` = pending upload |
| **Soft delete** | Setting `deleted_at` instead of physically removing a row, so deletions propagate to other devices |
| **Conflict** | A row where the remote version was updated after a local unsynced edit was made |
| **Bare workflow** | Expo project with committed native `android/` and `ios/` folders; Expo Go not supported |
| **FAIR** | Findable, Accessible, Interoperable, Reusable — data management principles |
| **FHIR** | Fast Healthcare Interoperability Resources — HL7 JSON-based healthcare data standard |
| **openEHR** | Open standard for structured electronic health records |
| **JSON-LD** | JSON for Linked Data — adds semantic meaning via a `@context` |
| **SNOMED CT** | Systematized Nomenclature of Medicine |
| **MONDO** | Monarch Disease Ontology |
| **UBERON** | Integrated cross-species anatomy ontology |
| **OBO Foundry** | Community of biomedical ontology authors |
| **DCAT** | Data Catalog Vocabulary — W3C standard for describing datasets |
| **w3id.org** | Permanent-identifier redirect service for ontology URIs |
