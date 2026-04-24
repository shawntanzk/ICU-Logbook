# ICU Logbook

A cross-platform mobile app for ICU and anaesthesia trainees to log clinical cases, procedures, ward reviews, transfers, and more — fully offline-first, with cloud sync, supervisor approval, ARCP portfolio export, and a FAIR semantic data layer.

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

Data is stored on-device first (offline-first SQLite), then two-way synced with **Supabase** (Postgres + Auth + RLS) whenever the device is online.

---

## 2. Who Is It For?

| Role | What they can do |
|---|---|
| **User** (trainee / fellow / registrar) | Logs their own cases, procedures, and clinical episodes. Sees anything they own *or* where they are listed as supervisor / observer. Writes reflections, tracks their competency. |
| **Admin** | Everything above, plus: sees every record in the system regardless of owner, and manages users from the Admin Panel (role toggle, disable, password reset, delete). |

Supervision and observation are recorded **per record** via user pickers — not as account-level roles. A user can supervise one case and be supervised on another.

---

## 3. Features

### Registration & Auth
- **Self-registration** — dedicated RegisterScreen (separate from login) collects name, email, password, country (195 ISO countries), and medical registration number
- **Medical reg number encryption** — HMAC-SHA256 hashed on the server the moment it is submitted; the plaintext never touches the database; not even administrators can read it; authorised validators can check it via a separate tool
- **Email + password sign-in** with password strength meter and forgot-password flow
- **Google OAuth** via PKCE + in-app browser. Google users who bypass the registration form are directed to `CompleteRegistrationScreen` to supply their country + reg number before reaching the app
- **Terms gate** — versioned Terms & Privacy screen shown between login and the main app; must be re-accepted on version bumps

### Clinical Log Entry (10 entry types)
- **ICU / HDU Cases** — date, diagnosis, ICD-10, organ systems, CoBaTrICE domains, supervision level, COBATRICE domains, patient demographics, level of care, involvement, cardiac arrest flag, outcome, relative communication, teaching delivered, reflection
- **Ward Reviews** — ward, primary reason, patient demographics, outcome
- **ED Attendances** — presentation, triage category, outcome
- **Transfers** — origin/destination, clinical indication, team composition
- **Medicine Placements** — specialty, duration, learning objectives
- **Airway Management** — device, grade, technique, intubation success
- **Arterial Lines** — site, approach, attempts, success
- **Central Venous Catheters (CVC)** — site, side, approach, attempts, is second CVC, success
- **Ultrasound Studies** — type, findings, real-time guidance
- **Regional Blocks** — block type, technique, nerve stimulator, success

All entry types share: date, supervisor user picker, external supervisor name, supervisor approval state, sync bookkeeping columns, schema version, JSONB coded fields, consent status, license.

### Log Hub
A central hub screen (Log tab) lets users pick any of the 10 entry types from a categorised list. Quick-add chips for the most common procedure types.

### Case List & Detail
- Searchable, filterable list of cases with owner badge and "You supervised / You observed" relation pills
- Full case detail with supervisor/observer display names resolved, linked procedures, approval state, sync status
- **Approve / Revoke approval** available to users listed as supervisor on a case
- Add Case shortcut via `+` button in the Cases tab header

### Procedures Tab
- Filterable list of all procedure types (airway, arterial line, CVC, USS, regional block)
- Procedure type chosen from a **dropdown selector** (SelectField) rather than a chip grid
- Success rate and type-count statistics

### Dashboard
- Stat cards: total cases, cases this month, procedures logged, success rate, domains covered
- Specialty breakdown, level of care distribution, mortality stats, USS and regional block counts
- Blue banner → Competency Map (3×4 dot grid across all 12 CoBaTrICE domains, colour-coded by case count)
- Five most recent cases; admin sees all users' data

### Export
- **ARCP Portfolio CSV** — single multi-section CSV covering all 10 log types, ARCP/FICM-field aligned
- **HL7 FHIR R4 Bundle** — Encounter + Condition + Observation + Provenance per case
- **openEHR Composition**
- **JSON-LD 1.1** — joinable with SNOMED/ICD-10-coded datasets

### Sync & Offline
- Two-way Supabase sync on every write and on demand (Settings → Sync Now)
- Conflict detection: remote-updated + local-unsynced rows flagged; resolve in Settings → Sync Conflicts
- **Offline-only mode** (Settings toggle) — short-circuits all network calls

### Settings
- Change password, Data Sharing & Consent (4-way model), Export, Admin Panel, Change Password, Sync Conflicts, Sign Out
- **Admin Panel** — list all users, toggle role, disable/re-enable, reset password (sends recovery email), delete

### Security
- Medical registration number: HMAC-SHA256 with a secret pepper (server-only); irreversible
- Standalone **validator tool** (`docs/validator.html`) for training bodies to verify a reg number without seeing any PII
- RLS on all Supabase tables (36 policies across 11 tables)
- iOS export compliance pre-declared (`ITSAppUsesNonExemptEncryption = false`)
- WebCrypto polyfill ensures Supabase uses PKCE S256 (not plain) on Hermes

---

## 4. Tech Stack

| Technology | What it does |
|---|---|
| **React Native / Expo SDK 52** | Native iOS & Android UI from one codebase |
| **TypeScript (strict)** | Type safety across the entire codebase |
| **expo-sqlite** | Local offline-first database |
| **Zustand** | Lightweight reactive state management |
| **Zod** | Runtime schema validation |
| **React Navigation v6** | Bottom tabs + native stacks |
| **Supabase** | Cloud auth + Postgres + RLS + Edge Functions |
| **Deno (Edge Functions)** | Server-side registration hashing, admin ops, validator |
| **dayjs** | Date formatting |
| **EAS (Expo Application Services)** | Cloud builds + store submission |

---

## 5. Project Structure

```
ICU-Logbook/
├── App.tsx                         Entry point — DB init, store hydration, navigator
├── index.js                        Registers root; imports crypto polyfill first
├── app.json                        Expo project config (bundle IDs, icons, EAS privacy manifests)
├── eas.json                        EAS build profiles: development / preview / production
├── babel.config.js
├── tsconfig.json
│
├── src/
│   ├── data/
│   │   ├── countries.ts            195 ISO 3166-1 countries for the registration picker
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
│   │   ├── client.native.ts        Opens icu_logbook.db
│   │   ├── client.web.ts           Web stub
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
│   │   ├── SyncService.ts          Two-way sync + conflict tracking
│   │   ├── QualityService.ts       Completeness + coding confidence scores (13 fields)
│   │   ├── SettingsService.ts
│   │   ├── secureStorage.ts        Chunked expo-secure-store adapter
│   │   ├── errorReporting.ts       Sentry-ready reporter
│   │   └── export/
│   │       ├── ARCPExporter.ts     Multi-section ARCP portfolio CSV
│   │       ├── FHIRExporter.ts
│   │       ├── OpenEHRExporter.ts
│   │       ├── JSONLDExporter.ts
│   │       └── index.ts
│   │
│   ├── store/
│   │   ├── authStore.ts            Session, role, country, profileComplete, completeRegistration()
│   │   ├── caseStore.ts
│   │   ├── procedureStore.ts
│   │   ├── consentStore.ts
│   │   ├── offlineStore.ts
│   │   ├── networkStore.ts
│   │   ├── termsStore.ts
│   │   └── syncStore.ts
│   │
│   ├── components/                 Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── FormField.tsx
│   │   ├── SelectField.tsx         Modal single-select dropdown
│   │   ├── ToggleField.tsx         Boolean toggle row
│   │   ├── MultiSelect.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── UserPicker.tsx
│   │   ├── PasswordStrengthMeter.tsx
│   │   ├── NetworkBanner.tsx
│   │   └── …
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx             Sign in + Google OAuth + forgot password
│   │   ├── RegisterScreen.tsx          Full self-registration (name/email/pw/country/reg num)
│   │   ├── CompleteRegistrationScreen.tsx  Country + reg num for Google OAuth users
│   │   ├── TermsScreen.tsx             Versioned Terms & Privacy gate
│   │   ├── DashboardScreen.tsx
│   │   ├── CompetencyScreen.tsx
│   │   ├── CaseListScreen.tsx
│   │   ├── CaseDetailScreen.tsx
│   │   ├── AddCaseScreen.tsx
│   │   ├── EditCaseScreen.tsx
│   │   ├── LogHubScreen.tsx            Central entry-type picker hub
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
│   │   ├── SettingsScreen.tsx
│   │   ├── ConsentScreen.tsx
│   │   ├── ExportScreen.tsx
│   │   ├── AdminPanelScreen.tsx
│   │   ├── ChangePasswordScreen.tsx
│   │   └── ConflictsScreen.tsx
│   │
│   ├── navigation/
│   │   ├── types.ts                RootStack / Tab / sub-stack param types
│   │   └── RootNavigator.tsx       Auth gate → Terms gate → Profile gate → Main tabs
│   │
│   ├── polyfills/
│   │   └── crypto.ts               WebCrypto polyfill (HMAC digest via expo-crypto for Supabase PKCE)
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
│   │   └── 20260424000006_profiles_registration_fields.sql  ← country + med_reg_hmac
│   └── functions/
│       ├── admin-users/            Admin user management (service role, admin JWT required)
│       ├── register/               Public signup + server-side HMAC hashing
│       ├── set-registration/       Post-login reg number setter (JWT auth, for OAuth users)
│       └── validate-registration/  Validator tool endpoint (VALIDATOR_SECRET header)
│
├── docs/
│   ├── privacy-policy.html         GDPR-compliant privacy policy (host at your domain)
│   └── validator.html              Standalone reg-number validator tool for training bodies
│
├── android/                        Bare workflow native Android project
├── ios/                            Bare workflow native iOS project
│
├── APP_STORE_SUBMISSION.md         Step-by-step 66-item submission checklist
├── PRODUCTION_TODO.md              Short LLM-friendly production readiness summary
├── SETUP.md                        Developer setup guide
└── README.md                       This file
```

---

## 6. Installation

### Prerequisites
- **Node.js 20+** — [nodejs.org](https://nodejs.org) (LTS version)
- **EAS CLI** — `npm install -g eas-cli` (replaces the old `expo-cli` for builds)
- **iOS builds**: Xcode 15+ on Mac
- **Android builds**: Android Studio + emulator
- A **Supabase project** with migrations applied (see [SETUP.md](SETUP.md))

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-org/ICU-Logbook.git
cd ICU-Logbook

# 2. Install dependencies
npm install

# 3. Configure Supabase credentials
cp .env.example .env
# Edit .env:
#   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

---

## 7. Running the App

```bash
npx expo start
```

| What you want | Action |
|---|---|
| iOS Simulator (Mac + Xcode) | Press `i` |
| Android Emulator | Press `a` |
| Physical device | Scan QR with Expo Go |
| Web (limited) | Press `w` |

> **First launch:** The app runs SQLite migrations, then shows the Login screen. Create an account via **Register** (email flow) or **Continue with Google**. All new accounts are role `user`. Promote the first admin from the Supabase dashboard — see [SETUP.md](SETUP.md).

---

## 8. Using the App

### Creating an account

Tap **Create an Account** on the Login screen. The dedicated RegisterScreen collects:

1. **Full name** — shown as your display name throughout the app
2. **Email** — used for sign-in and notifications
3. **Password** — minimum 8 characters; strength meter shown inline
4. **Confirm password**
5. **Country** — chosen from a searchable dropdown of 195 countries (ISO 3166-1)
6. **Medical registration number** — your GMC, AHPRA, IMC, or equivalent number. This is submitted to the server over HTTPS, immediately hashed with HMAC-SHA256, and stored as a 64-character hex digest. The original number is never written to the database — not even administrators can retrieve it.
7. **Terms agreement** checkbox

If email confirmation is enabled on the Supabase project you will receive a confirmation email; click the link, then sign in normally.

**Google OAuth users:** Signing in with Google skips the registration form. After your first login you will be directed to a short completion screen asking for your country and medical registration number before you can access the app.

### Navigation gate order

Every session passes through these gates in sequence:

```
Not logged in  →  Login / Register
Logged in      →  Terms & Privacy (if not yet accepted for this version)
               →  Complete Registration (if country + reg number not set)
               →  Main app (5 tabs)
```

### Logging a case

1. Tap the **Log** tab (centre of bottom bar) → **ICU / HDU Case**
2. Fill the form — all fields with a red asterisk are required
3. Tap **Save** — the case is immediately available in the Cases tab and on the Dashboard

Alternatively, tap **Cases** → `+` (top-right header) to jump straight to the Add Case form from within the Cases tab.

### Logging a procedure

From the **Log** tab → choose any procedure type, or go to the **Procedures** tab → **Log Procedure**. Procedure type is chosen from a dropdown. Optionally link to a recent case by tapping it in the horizontal case scroller.

### Supervisor approval

When you name someone as supervisor on any log entry, they see the record in their own lists with a "You supervised" pill. They can tap **Approve** on the case detail screen. You — the owner — see the approval status. Admins can approve any record.

### Exporting your portfolio

**Settings → Export → ARCP Portfolio (CSV)** — generates a single multi-section CSV covering all 10 log types, ready to import into Excel or share with your training programme. FHIR, openEHR, and JSON-LD options are also available.

### Who sees what

| Account | Sees |
|---|---|
| **User** | Records they own + records where they're named as supervisor or observer |
| **Admin** | Every record across all users |

This is enforced at both the SQL (SQLite WHERE fragments) and the Postgres (RLS policies) layer simultaneously.

### Admin tasks

**Settings → Admin Panel** — lists all accounts. Actions: toggle role, disable/re-enable, send password reset email, delete user. Admins see a shield badge on the Dashboard and an "Administrator · all records" subtitle.

---

## 9. Security & Privacy

### Medical registration number

The registration number travels over HTTPS to the `register` (or `set-registration`) Supabase Edge Function. The function:

1. Normalises: `UPPER(STRIP_WHITESPACE(number))`
2. Computes `HMAC-SHA256(normalised, MED_REG_PEPPER)` where `MED_REG_PEPPER` is a 256-bit random secret stored only in the Edge Function environment
3. Stores the 64-character hex digest in `profiles.med_reg_hmac`

The digest is deterministic (same input → same output), so a **validator tool** (`docs/validator.html`) can check whether a given number is registered without ever seeing the original. The pepper means even a full database dump cannot be brute-forced without it.

**Important:** `MED_REG_PEPPER` must not be changed after users have registered — doing so would invalidate all stored hashes.

### Row-level security

All 11 Supabase tables have RLS enabled with four policies each (SELECT / INSERT / UPDATE / DELETE). Users can only read/write their own records. Supervisor/observer users can read (not edit) records where they appear. Admins have full access.

### Encryption in transit

All client↔Supabase traffic uses TLS 1.2+. The app pre-declares `ITSAppUsesNonExemptEncryption = false` in `Info.plist` — it uses only standard HTTPS, not custom encryption algorithms.

### Local data

SQLite lives in the app sandbox. Auth tokens are stored in Expo SecureStore (iOS Keychain / Android Keystore). Neither is accessible to other apps.

### Data-sharing consent

Four levels (Private / Anonymous / Research / Commercial). Consent is recorded per-user and attached to each export. Free-text fields are scrubbed for PII patterns before any export leaves the device.

---

## 10. FAIR Semantic Data Product

> This section documents the research-data layer — relevant if you are integrating with biomedical knowledge graphs or building a data commercial product. Skip it if you only need the logbook features.

The app is designed so its data is **FAIR** (Findable, Accessible, Interoperable, Reusable) and joinable with the global biomedical research graph.

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

### OBO / Monarch KG alignment

Every coded value is exported with dual coding: primary clinical code (ICD-10 / SNOMED CT) + OBO mapping (MONDO / UBERON). This makes records directly joinable with the Monarch Initiative Knowledge Graph via SPARQL or the BioLink API — no additional ETL.

### Schema assets

`assets/schema/` contains the JSON-LD context, OWL ontology, SHACL shapes, and DCAT catalog — intended to be published at stable `w3id.org` IRIs.

---

## 11. Architecture Decisions

### Why a dedicated RegisterScreen instead of inline sign-up?

The registration form collects 7 fields (name, email, password × 2, country, reg number, terms). Cramming that into the LoginScreen's card would make the sign-in path visually overwhelming. A separate screen also lets the form scroll freely, keeps the sign-in path fast, and makes it easy to add more registration steps (e.g. training programme, speciality) without touching the login flow.

### Why hash the medical reg number instead of encrypting it?

Encryption implies you can retrieve the original — which requires a key, key management, and protections against key theft. Hashing (HMAC-SHA256 with a server-side pepper) is sufficient because:

- **Validation only needs a yes/no answer.** The validator recomputes the HMAC and compares — no decryption needed.
- **The pepper is the secret.** Even with full DB access, you cannot reverse the hash without knowing the pepper. Rotating the pepper is the only way to "revoke" access to historical hashes.
- **No key management complexity.** The pepper is one Supabase secret; there is no asymmetric key pair to manage.

### Why route signup through an Edge Function?

Calling `supabase.auth.signUp()` from the client creates the auth user but leaves the profile incomplete until a second call sets the country and reg number hash. There is a window where the auth user exists but has no profile data — and if the second call fails, you have a broken account. Routing through the `register` Edge Function creates the auth user, computes the HMAC, and writes the profile atomically (rolling back the auth user if the profile write fails).

### Why SQLite instead of WatermelonDB?

`expo-sqlite` with manual SQL is simpler to audit, faster to build, and sufficient for the record volumes of a single trainee's logbook. The `IDataService` abstraction in `DataService.ts` means swapping to WatermelonDB later touches only the service layer.

### Why Zustand instead of Redux Toolkit?

Equivalent functionality at ~1/5 the code, with no providers or boilerplate. Full TypeScript support. Same mental model — migrating to Redux later is straightforward.

### Why a separate `authState.ts` module?

`AuthScope.ts` needs to know the current user ID to build WHERE fragments, but importing from `authStore` creates a circular dependency (`store → service → scope → store`). `authState.ts` is a plain shared reference that breaks the cycle without any framework machinery.

---

## 12. Extending the App

### Adding a new entry type

1. Create `src/models/YourLog.ts` — TypeScript type + Zod schema
2. Create `src/services/YourService.ts` — CRUD + soft-delete
3. Run a Supabase migration to create the cloud table and RLS policies (see `supabase/migrations/20260424000004_new_clinical_tables.sql` for the template)
4. Create `src/screens/AddYourScreen.tsx`
5. Add to `LogStackParamList` in `src/navigation/types.ts`
6. Add the screen to `LogNavigator` in `RootNavigator.tsx`
7. Add a tile to `LogHubScreen.tsx`
8. Add a section to `src/services/export/ARCPExporter.ts`

### Adding a new ICD-10 code

Append to the `ICD10_CODES` array in `src/data/icd10.ts`:

```ts
{ code: 'J96.90', label: 'Respiratory failure, unspecified' },
```

No other wiring needed.

### Adding AI summaries

1. Create `src/services/AIService.ts`
2. Call the Claude API via a Supabase Edge Function (never from the client — that would expose your key)
3. Replace the placeholder `handleAISummary` in `CaseDetailScreen.tsx` with the real response

### Supabase schema changes

Write a new migration file in `supabase/migrations/` (timestamp prefix, descriptive name). Apply it:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

Or paste into the dashboard SQL editor. Always mirror cloud schema changes in `src/database/migrations.ts` with an additive `ALTER TABLE ADD COLUMN`.

### Database migrations (local SQLite)

Open `src/database/migrations.ts`, append a new entry with `version: N+1`. Never edit existing entries — devices on version N will run all entries above it automatically on next launch.

---

## 13. App Store Submission

See **[APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md)** for the full 66-item checklist covering:
- Apple Developer account + App Store Connect setup
- iOS code signing, screenshots, privacy nutrition labels
- Android keystore generation, Play App Signing, Data Safety form
- EAS build commands for both platforms
- Supabase secrets to set before launch
- Store listing copy drafts

See **[PRODUCTION_TODO.md](PRODUCTION_TODO.md)** for a short LLM-friendly summary of what's done and what remains.

---

## 14. Troubleshooting

### `npm install` fails
- Check `node --version` ≥ 20
- Delete `node_modules/` and `package-lock.json`, then re-run `npm install`
- Mac permission errors: `sudo npm install`

### App shows "Initialising…" indefinitely
Database migration failed. Check available device storage. Erase the simulator and try again.

### QR code doesn't work
- Phone and computer must be on the same Wi-Fi network
- Try `npx expo start --tunnel` to route through Expo's servers

### Changes aren't appearing
Shake the device → **Reload**, or press `r` in the terminal.

### "I can't see my cases"
- Visibility is owner-scoped. Sign in as the account that created the cases, or use an admin account.
- If you reinstalled the app, the local SQLite file was erased. Cloud data re-syncs on next login (if online).

### Registration fails with "Server misconfiguration"
The `MED_REG_PEPPER` secret has not been set on the Supabase project. Run:
```bash
supabase secrets set MED_REG_PEPPER=$(openssl rand -hex 32)
supabase functions deploy register --no-verify-jwt
```

### Want to wipe everything and start over
Erase the simulator or uninstall the app (removes local SQLite). Delete the user from Supabase Auth → Users (cascades the profile row and clinical data). On next launch you'll see the Login screen.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **ARCP** | Annual Review of Competence Progression — the annual portfolio review for UK specialty trainees |
| **CoBaTrICE** | Competency Based Training in Intensive Care Medicine for Europe — 12-domain framework |
| **ICD-10** | International Classification of Diseases, 10th revision — standard diagnosis codes |
| **Ottawa EPA** | Entrustable Professional Activity scale — levels of supervision/entrustment |
| **HMAC-SHA256** | Hash-based Message Authentication Code using SHA-256 — a keyed one-way hash used here to irreversibly store the medical registration number |
| **Pepper** | A server-side secret mixed into a hash to prevent rainbow-table attacks even with full DB access |
| **RLS** | Row-Level Security — Postgres feature that enforces per-row access rules at the database layer |
| **PKCE** | Proof Key for Code Exchange — OAuth extension that prevents auth-code interception on mobile |
| **EAS** | Expo Application Services — cloud build and submission tooling |
| **Offline-first** | Data is saved locally before any network call; the app works without internet |
| **SQLite** | File-based local database stored in the app sandbox |
| **Supabase** | Open-source Firebase alternative — Postgres + Auth + Storage + Edge Functions |
| **Zustand** | Lightweight React state management |
| **Zod** | TypeScript-first runtime schema validation |
| **Migration** | A versioned script that updates the database schema without losing existing data |
| **Sync flag** | `synced` boolean on every local row — `false` = pending upload |
| **Soft delete** | Setting `deleted_at` instead of physically removing a row, so the deletion propagates to other devices |
| **Conflict** | A row where the remote version was updated after a local unsynced edit was made |
| **FAIR** | Findable, Accessible, Interoperable, Reusable — data management principles |
| **FHIR** | Fast Healthcare Interoperability Resources — HL7 JSON-based healthcare data standard |
| **openEHR** | Open standard for structured electronic health records |
| **JSON-LD** | JSON for Linked Data — adds semantic meaning via a `@context` |
| **SNOMED CT** | Systematized Nomenclature of Medicine — comprehensive clinical terminology |
| **MONDO** | Monarch Disease Ontology — unified disease identifiers |
| **UBERON** | Integrated cross-species anatomy ontology |
| **OBO Foundry** | Community of biomedical ontology authors — home of MONDO, UBERON, HP, etc. |
| **Monarch KG** | Monarch Initiative Knowledge Graph — cross-species biomedical graph |
| **Biolink Model** | High-level schema aligning biomedical data sources under common categories |
| **DCAT** | Data Catalog Vocabulary — W3C standard for describing datasets |
| **SPDX** | Software Package Data Exchange — standard for declaring licenses (e.g. `CC-BY-NC-4.0`) |
| **w3id.org** | Permanent-identifier redirect service for ontology URIs |
| **Epoch week** | ISO week number since Unix epoch — de-identification technique that preserves temporal patterns without exposing exact dates |
