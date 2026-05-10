# ICU Logbook — Setup & Extension Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your Supabase credentials
cp .env.example .env
# edit .env: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Start Expo
npx expo start

# Then press:
#   i → iOS Simulator
#   a → Android Emulator
#   Scan QR code → Expo Go on physical device
```

On first launch the app opens the local SQLite cache, runs migrations, and shows the Login screen. From there you can sign in, tap **Create an Account** (opens RegisterScreen — email, password, country, medical registration number), or **Continue with Google**. Google sign-in routes through a second screen to collect country + registration number before entering the main app.

The first admin is promoted from the Supabase dashboard — see below.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (required for production builds and submissions)
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio + emulator
- A Supabase project with the schema and Edge Functions applied (see "Backend setup")

---

## Project Structure

```
/
├── App.tsx                              DB init + consent/auth/offline hydrate + navigation
├── app.json                             Expo config (icons, permissions, iOS/Android metadata)
├── eas.json                             EAS build profiles (dev / preview / production)
├── docs/
│   ├── privacy-policy.html              GDPR-compliant privacy policy (host publicly)
│   └── validator.html                   Standalone registration validator tool for training bodies
├── src/
│   ├── data/
│   │   └── countries.ts                 195 ISO 3166-1 countries (COUNTRIES, COUNTRY_OPTIONS, countryName)
│   ├── models/                          TypeScript types + Zod schemas
│   ├── database/
│   │   ├── client.native.ts             Local cache DB (icu_logbook.db)
│   │   └── migrations.ts                v1 → v8 local schema migrations
│   ├── polyfills/
│   │   └── crypto.ts                    WebCrypto polyfill (expo-crypto) for PKCE on Hermes
│   ├── services/
│   │   ├── supabase.ts                  Real Supabase client (SecureStore session, PKCE)
│   │   ├── DataService.ts               IDataService + ISyncService interfaces
│   │   ├── CaseService.ts               CRUD + soft delete (owner-scoped)
│   │   ├── ProcedureService.ts          CRUD + soft delete (owner-scoped)
│   │   ├── AuthService.ts               Supabase auth + profile + setMedicalRegistration()
│   │   ├── AuthScope.ts                 SQL WHERE fragments for visibility rules
│   │   ├── authState.ts                 Shared auth ref (breaks store ↔ scope cycle)
│   │   ├── SyncService.ts               Two-way sync with Supabase + conflict tracking
│   │   ├── SettingsService.ts           Key/value store on app_settings
│   │   ├── secureStorage.ts             Chunked expo-secure-store adapter for Supabase sessions
│   │   └── errorReporting.ts            Sentry-ready no-op reporter (init + setUser + capture)
│   ├── store/
│   │   ├── authStore.ts                 Session + role + signIn / signUp / completeRegistration / Google OAuth
│   │   ├── caseStore.ts                 Cases + stats + auto-sync trigger
│   │   ├── procedureStore.ts            Procedures + stats + auto-sync trigger
│   │   ├── consentStore.ts              Four-way data-sharing consent
│   │   ├── offlineStore.ts              Offline-only toggle (kills sync)
│   │   ├── networkStore.ts              NetInfo-backed online/offline tracking
│   │   ├── termsStore.ts                Versioned Terms & Privacy acceptance gate
│   │   └── syncStore.ts                 Sync state (isSyncing, status, lastResult)
│   ├── components/                      Reusable UI primitives
│   ├── screens/
│   │   ├── LoginScreen.tsx              Email/password sign-in + Google OAuth + "Create Account" nav
│   │   ├── RegisterScreen.tsx           New account: name, email, password, country, med reg number
│   │   ├── CompleteRegistrationScreen.tsx  Post-OAuth: country + med reg number collection
│   │   ├── TermsScreen.tsx              Hard gate shown between login and Main
│   │   ├── ChangePasswordScreen.tsx
│   │   ├── ConflictsScreen.tsx          Keep-mine / keep-server resolver for sync conflicts
│   │   ├── DashboardScreen.tsx          Logged / Supervised / Procedures + filter pills
│   │   ├── CaseDetailScreen.tsx         Approve / Edit / Delete buttons
│   │   ├── EditCaseScreen.tsx           Owner/admin only
│   │   ├── EditProcedureScreen.tsx
│   │   └── …
│   ├── navigation/
│   │   ├── RootNavigator.tsx            Auth gate → Terms gate → profileComplete gate → Main tabs
│   │   └── types.ts                     RootStackParamList (Login, Register, CompleteRegistration, …)
│   └── utils/
├── supabase/
│   ├── functions/
│   │   ├── register/                    Public signup + HMAC hash (no JWT required)
│   │   ├── set-registration/            OAuth user reg number collection (JWT required)
│   │   ├── validate-registration/       Training body validator (VALIDATOR_SECRET required)
│   │   └── admin-users/                 Admin user management (no JWT check — validates internally)
│   └── migrations/
│       ├── 20260420000000_profiles.sql
│       ├── 20260420000001_audit_log.sql
│       ├── 20260420000002_rls_clinical_tables.sql
│       ├── 20260421000000_new_clinical_tables.sql
│       ├── 20260421000001_rls_new_clinical_tables.sql
│       ├── 20260422000000_profiles_registration_fields_v1.sql
│       └── 20260422000001_rls_new_clinical_tables_v10.sql
```

---

## Backend setup (Supabase)

The app talks to Supabase for **auth + data sync**. SQLite is the local cache — every read happens locally, every write is queued for sync.

### 1. Provision the project

1. Create a new Supabase project (free tier is fine for piloting).
2. Apply migrations from `supabase/migrations/` in timestamp order:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
   or paste each file into the dashboard SQL editor in order:
   - `20260420000000_profiles.sql` — `profiles` table + auto-create trigger on `auth.users` insert + RLS on profiles.
   - `20260420000001_audit_log.sql` — append-only `audit_log` table with triggers on clinical tables.
   - `20260420000002_rls_clinical_tables.sql` — RLS policies on `case_logs` / `procedure_logs` plus supervisor-column guard triggers.
   - `20260421000000_new_clinical_tables.sql` — new clinical tables (transfers, medicine placements, airway, arterial line, CVC, USS, regional block — ward reviews and ED attendances subsequently removed).
   - `20260421000001_rls_new_clinical_tables.sql` — initial RLS on the 9 new tables.
   - `20260422000000_profiles_registration_fields_v1.sql` — adds `country`, `med_reg_hmac`, `med_reg_set_at` columns to `profiles` with indexes + updated trigger.
   - `20260422000001_rls_new_clinical_tables_v10.sql` — finalised 36-policy RLS set (4 policies × 9 tables) + approval-column guard + `bump_server_updated_at` triggers.

**WITHOUT MIGRATIONS 1–3 YOUR DATA IS WORLD-READABLE** to any authenticated user via the REST API. Do not skip them.

### 2. Deploy Edge Functions

Four Edge Functions must be deployed for auth and registration to work:

```bash
# Registration system
supabase functions deploy register --no-verify-jwt          # public signup
supabase functions deploy set-registration                   # JWT-authenticated (OAuth users)
supabase functions deploy validate-registration --no-verify-jwt  # training body validator

# Admin user management (existing)
supabase functions deploy admin-users --no-verify-jwt
```

### 3. Set secrets

```bash
# Generate once and store permanently — changing MED_REG_PEPPER
# invalidates all stored registration number hashes.
supabase secrets set MED_REG_PEPPER=$(openssl rand -hex 32)

# Share only with authorised training body validators
supabase secrets set VALIDATOR_SECRET=$(openssl rand -hex 32)

# Supabase runtime secrets (auto-available in Deno but set explicitly if needed)
supabase secrets set \
  SUPABASE_URL="https://<ref>.supabase.co" \
  SUPABASE_ANON_KEY="<anon key>" \
  SUPABASE_SERVICE_ROLE_KEY="<service role key>"
```

> **Warning — `MED_REG_PEPPER` is permanent.** Once users have registered, this secret cannot be rotated without re-collecting every medical registration number. Store it in a password manager or secrets vault before anything else.

### 4. First admin

Anyone who signs up lands as role `user`. Promote the first admin from the Supabase dashboard:

1. Sign up normally from the app (complete the full registration flow).
2. Open *Authentication → Users → <your row> → Edit user → Raw App Meta Data* and set:
   ```json
   { "role": "admin" }
   ```
3. Also update the mirrored row in *Table Editor → profiles* — set `role = 'admin'`. The RLS policies check `auth.jwt().app_metadata.role`, but the admin UI lists profiles for display.

Sign out and back in so a fresh JWT carrying the new claim is issued.

### 5. Google sign-in (optional but recommended)

1. Supabase dashboard → *Authentication → Providers → Google* → enable.
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (type: *Web application*).
3. Add the Supabase callback as an authorised redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste the Google client ID + secret back into the Supabase provider settings.
5. In Supabase *Authentication → URL Configuration → Additional Redirect URLs*, add:
   `iculogbook://auth-callback`

The mobile app uses the PKCE flow: it opens Google in an in-app browser, catches the `iculogbook://auth-callback?code=…` redirect, and exchanges the code for a session on-device.

6. **Enable manual identity linking** (Authentication → Settings → Manual linking) so users can link/unlink Google from Settings → Sign-in Methods.

> Google users skip the RegisterScreen. After their first sign-in they see CompleteRegistrationScreen to collect country + medical registration number. Once saved, `profileComplete` becomes `true` and they enter the main app.

### 6. Self-signup & email confirmation

The registration flow routes through the `register` Edge Function (not `supabase.auth.signUp` directly). This is necessary because the registration number must be hashed server-side before any email confirmation occurs.

- With email confirmation on (default): the function creates the account and returns `{ needsEmailConfirmation: true }`. The app prompts the user to check their inbox.
- To skip confirmation for a pilot: *Authentication → Providers → Email → Confirm email* → turn off.

### 7. Environment variables

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
```

`.env` is git-ignored. `.env.example` ships placeholder values.

---

## Registration System

Medical registration numbers are handled with a server-side HMAC-SHA256 approach:

```
Client → HTTPS → register Edge Function → HMAC-SHA256(normalise(number), MED_REG_PEPPER) → profiles.med_reg_hmac
```

- The plaintext number never reaches the database.
- The hash is deterministic — the same number always produces the same hash, enabling validation.
- Admins cannot reverse the hash without the pepper.
- `profileComplete` in `authStore` is `true` only when both `profiles.country IS NOT NULL` AND `profiles.med_reg_hmac IS NOT NULL`.

**Normalisation:** `trim().toUpperCase().replace(/\s+/g, '')` — applied identically at registration and at validation time.

### Validator tool

`docs/validator.html` is a standalone HTML page for authorised training bodies. Give them the `VALIDATOR_SECRET` and host the HTML at any accessible URL. It sends the registration number to the `validate-registration` Edge Function over HTTPS and returns only `found: true/false` + country + registration date — no personal data.

---

## Local cache schema (`icu_logbook.db`)

| Table | Purpose |
|---|---|
| `schema_version` | Migration tracker |
| `case_logs` | Local copy of cases. Includes `synced`, `deleted_at`, `server_updated_at`, `conflict` for sync bookkeeping. |
| `procedure_logs` | Same shape as cases, plus `case_id` FK. |
| `app_settings` | Key/value (device id, consent, offline-only flag, last-sync watermark). |

Local SQLite migrations (additive, never edited):

- **v1** — base tables
- **v2** — FAIR semantic layer (coded JSON, provenance, quality, consent, license)
- **v3** — `owner_id`
- **v4** — case `supervisor_user_id` + `observer_user_id`
- **v5** — same on procedure_logs
- **v6** — approval workflow (`approved_by`, `approved_at`, `external_supervisor_name`)
- **v7** — sync bookkeeping (`server_updated_at`, `deleted_at`, `conflict`)
- **v8** — push retry bookkeeping (`sync_retry_count`, `sync_last_error`) + `(synced, conflict)` indexes

---

## Authentication Flow

1. App boots, opens local SQLite, runs migrations.
2. `authStore.restore()` calls `restoreSession()` (Supabase `getSession()` reads the JWT from SecureStore).
3. Navigation gate order:
   - Not logged in → **Login** / **Register** screens
   - Logged in, terms not accepted → **TermsScreen** (hard gate)
   - Logged in, terms accepted, `profileComplete === false` → **CompleteRegistrationScreen** (collects country + reg number for OAuth users)
   - Logged in, terms accepted, `profileComplete === true` → **Main tabs**
4. `handle_new_user` Postgres trigger creates the matching `profiles` row for every new `auth.users` entry (role defaults to `user`).
5. To grant admin: update `app_metadata.role = 'admin'` in Auth → Users, and set `role = 'admin'` in profiles.

To reset a session on-device: erase the simulator (*Device → Erase All Content and Settings…*) or sign out from Settings. To wipe an account entirely: delete the user in Auth → Users (profile row cascades).

---

## Role & Visibility Model

Two roles: **`admin`** and **`user`**. Supervision and observation are recorded **per record**, not per account.

`src/services/AuthScope.ts` defines:

```ts
scopedWhere()          // admin → 1=1; user → owner_id = ?
caseScopedWhere()      // admin → 1=1; user → (owner_id = ? OR supervisor_user_id = ? OR observer_user_id = ?)
procedureScopedWhere() // same
```

Every local SQL read interpolates one of these. Postgres RLS enforces the same shape on the server, so a non-admin user physically cannot read rows they aren't entitled to even with a hand-crafted client.

**Edits**: the owner of a record (and any admin) sees an Edit button. Supervisors can only **approve / revoke approval**, not change content.

---

## Sync Architecture

Two-way sync runs after every local write and when the user taps **Sync Now** in Settings.

Pipeline:

1. **Push.** All rows where `synced = 0` are upserted to Supabase. Soft-deleted rows (`deleted_at IS NOT NULL`) are pushed the same way.
2. **Pull.** Rows whose `server_updated_at > last_pull_watermark` are fetched and `INSERT OR REPLACE`d into local SQLite.
3. **Conflict.** If a row arrives in step 2 but the local copy has unsynced edits, `conflict = 1` is set and the local row is left alone.

**Offline-only mode** (Settings → toggle) short-circuits the sync entirely. No network calls, no profile reads, no upserts.

---

## Database Migrations

Open `src/database/migrations.ts`, append a new entry to the `MIGRATIONS` array, never edit existing ones — devices on a lower version will fail to reach yours.

SQLite cannot `ALTER TABLE ... DROP COLUMN`. For destructive changes use the rebuild pattern: `CREATE TABLE foo_new …; INSERT INTO foo_new SELECT … FROM foo; DROP TABLE foo; ALTER TABLE foo_new RENAME TO foo;`.

For Supabase schema changes, write a new migration in the dashboard's SQL editor (or via `supabase db push`) and bump the local schema in lockstep.

---

## Building for Production

See `APP_STORE_SUBMISSION.md` for the full checklist. Quick reference:

```bash
# iOS production build (handles signing via EAS)
eas build --platform ios --profile production

# Android production build (outputs .aab)
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Android release signing reads from `~/.gradle/gradle.properties`:
```
ICULOGBOOK_STORE_FILE=/absolute/path/to/release.keystore
ICULOGBOOK_STORE_PASSWORD=…
ICULOGBOOK_KEY_ALIAS=iculogbook
ICULOGBOOK_KEY_PASSWORD=…
```

---

## Adding AI Summaries

1. Create `src/services/AIService.ts`.
2. Call the Claude API via a **Supabase Edge Function** (never from the client — exposes your API key).
3. Replace the template `Alert.alert(...)` in `handleAISummary` (CaseDetailScreen) with the real response.

---

## Known Limitations

- No date picker — users type YYYY-MM-DD manually.
- Conflicts surface as a per-row flag but there's no dedicated resolution UI yet (last-writer-wins until you build one).
- Creating users / resetting passwords / deleting users from the app is routed through the `admin-users` Edge Function. Deploy with:
  ```bash
  supabase functions deploy admin-users --no-verify-jwt
  ```
  The function verifies the caller's JWT has `app_metadata.role = 'admin'` before touching the admin API.
- Push notifications (approval reminders) are not yet implemented — planned for v1.1.

See [PRODUCTION_TODO.md](PRODUCTION_TODO.md) for the full production readiness summary.
