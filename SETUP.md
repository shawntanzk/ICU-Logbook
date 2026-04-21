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

On first launch the app opens the local SQLite cache, runs migrations, and shows the Login screen. From there you can sign in, **create an account** (email + password), or **Continue with Google**. The first admin is promoted from the Supabase dashboard — see below.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio + emulator
- A Supabase project with the schema applied (see "Backend setup")

---

## Project Structure

```
/
├── App.tsx                        DB init + consent/auth/offline hydrate + navigation
├── src/
│   ├── models/                    TypeScript types + Zod schemas
│   ├── database/
│   │   ├── client.native.ts       Local cache DB (icu_logbook.db)
│   │   └── migrations.ts          v1 → v8 local schema migrations
│   ├── services/
│   │   ├── supabase.ts            Real Supabase client (SecureStore session, PKCE)
│   │   ├── DataService.ts         IDataService + ISyncService interfaces
│   │   ├── CaseService.ts         CRUD + soft delete (owner-scoped)
│   │   ├── ProcedureService.ts    CRUD + soft delete (owner-scoped)
│   │   ├── AuthService.ts         Supabase auth + profile management
│   │   ├── AuthScope.ts           SQL WHERE fragments for visibility rules
│   │   ├── authState.ts           Shared auth ref (breaks store ↔ scope cycle)
│   │   ├── SyncService.ts         Two-way sync with Supabase + conflict tracking
│   │   ├── SettingsService.ts     Key/value store on app_settings
│   │   ├── secureStorage.ts       Chunked expo-secure-store adapter for Supabase sessions
│   │   └── errorReporting.ts      Sentry-ready no-op reporter (init + setUser + capture)
│   ├── store/
│   │   ├── authStore.ts           Session + role + signUp / Google OAuth / password reset
│   │   ├── caseStore.ts           Cases + stats + auto-sync trigger
│   │   ├── procedureStore.ts      Procedures + stats + auto-sync trigger
│   │   ├── consentStore.ts        Four-way data-sharing consent
│   │   ├── offlineStore.ts        Offline-only toggle (kills sync)
│   │   ├── networkStore.ts        NetInfo-backed online/offline tracking
│   │   ├── termsStore.ts          Versioned Terms & Privacy acceptance gate
│   │   └── syncStore.ts           Sync state (isSyncing, status, lastResult)
│   ├── components/                Reusable UI primitives
│   ├── screens/
│   │   ├── LoginScreen.tsx        Email/password sign-in + sign-up, Google OAuth, forgot-password
│   │   ├── TermsScreen.tsx        Hard gate shown between login and Main
│   │   ├── ChangePasswordScreen.tsx
│   │   ├── ConflictsScreen.tsx    Keep-mine / keep-server resolver for sync conflicts
│   │   ├── DashboardScreen.tsx    Logged / Supervised / Procedures + filter pills
│   │   ├── CaseDetailScreen.tsx   Approve / Edit / Delete buttons
│   │   ├── EditCaseScreen.tsx     Owner/admin only
│   │   ├── EditProcedureScreen.tsx
│   │   └── …
│   ├── navigation/
│   └── utils/
```

---

## Backend setup (Supabase)

The app talks to Supabase for **auth + data sync**. SQLite is the local cache — every read happens locally, every write is queued for sync.

### 1. Provision the project

1. Create a new Supabase project (free tier is fine for piloting — see PRODUCTION_ROADMAP for capacity estimates).
2. Apply migrations from `supabase/migrations/` in timestamp order:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```
   or paste each file into the dashboard SQL editor in order:
   - `20260420000000_profiles.sql` — `profiles` table + auto-create trigger on `auth.users` insert + RLS on profiles.
   - `20260420000001_audit_log.sql` — append-only `audit_log` table with triggers on clinical tables.
   - `20260420000002_rls_clinical_tables.sql` — RLS policies on `case_logs` / `procedure_logs` plus supervisor-column guard triggers.

   You still need to create the `case_logs` and `procedure_logs` tables themselves on Supabase so the columns match the local SQLite schema (see `src/database/migrations.ts` for the exact shape). The RLS migration only attaches policies — it assumes the tables already exist.

3. Deploy the admin Edge Function and set its secrets:
   ```bash
   supabase functions deploy admin-users --no-verify-jwt
   supabase secrets set \
     SUPABASE_URL="https://<ref>.supabase.co" \
     SUPABASE_ANON_KEY="<anon key>" \
     SUPABASE_SERVICE_ROLE_KEY="<service role key>"
   ```

**WITHOUT THESE MIGRATIONS YOUR DATA IS WORLD-READABLE** to any authenticated user via the REST API. Do not skip step 2.

### 2. First admin

The app no longer ships an in-app admin-setup flow. Anyone who signs up (email+password or Google) lands as role `user`. Promote the first admin from the Supabase dashboard:

1. Sign up normally from the app.
2. Open *Authentication → Users → <your row> → Edit user → Raw App Meta Data* and set:
   ```json
   { "role": "admin" }
   ```
3. Also update the mirrored row in *Table Editor → profiles* — set `role = 'admin'`. The RLS policies check `auth.jwt().app_metadata.role`, but the admin UI lists profiles for display.

Sign out and back in so a fresh JWT carrying the new claim is issued. All subsequent admin operations (user management, audit log read, etc.) key off that claim.

### 3. Google sign-in (optional but recommended)

1. Supabase dashboard → *Authentication → Providers → Google* → enable.
2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** (type: *Web application*).
3. Add the Supabase callback as an authorised redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste the Google client ID + secret back into the Supabase provider settings.
5. In Supabase *Authentication → URL Configuration → Additional Redirect URLs*, add the app's deep-link:
   `iculogbook://auth-callback` (matches the `scheme` in `app.json`)

The mobile app uses the PKCE flow: it opens Google in an in-app browser, catches the `iculogbook://auth-callback?code=…` redirect, and exchanges the code for a session on-device. No server needed.

6. **Enable manual identity linking** so users can link / unlink Google from *Settings → Sign-in Methods* after signup: *Authentication → Settings → Manual linking* → turn on. Without this, `supabase.auth.linkIdentity` returns an error.

### 4. Self-signup & email confirmation

- The default Supabase setting requires email confirmation. With it on, `signUp` succeeds but the user must click the link before signing in.
- To skip confirmation for a pilot, turn off *Authentication → Providers → Email → Confirm email*. The app handles both states — if a signup needs confirmation, we prompt the user to check their inbox.

### 5. Inviting users the old way

`createUser` from the app intentionally throws — creating an account on someone else's behalf requires the service-role key, which doesn't belong on a phone. Use:

- *Supabase dashboard → Auth → Users → Invite user*, or
- A server-side admin Edge Function (sketch in PRODUCTION_ROADMAP §4).

`updateUserRole` and `setUserDisabled` work from the app because they only touch the `profiles` table (RLS lets admins update other rows).

### 6. Environment variables

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
```

`.env` is git-ignored. `.env.example` ships placeholder values.

---

## Local cache schema (`icu_logbook.db`)

| Table | Purpose |
|---|---|
| `schema_version` | Migration tracker |
| `case_logs` | Local copy of cases. Includes `synced`, `deleted_at`, `server_updated_at`, `conflict` for sync bookkeeping. |
| `procedure_logs` | Same shape as cases, plus `case_id` FK. |
| `app_settings` | Key/value (device id, consent, offline-only flag, last-sync watermark). |

Migrations (additive, never edited):

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
2. `authStore.restore()` calls `restoreSession()` (Supabase `getSession()` reads the JWT from AsyncStorage).
3. If no session → Login screen with three actions: Sign In, Create Account, Continue with Google.
4. `handle_new_user` Postgres trigger creates the matching `profiles` row for every new `auth.users` entry (role defaults to `user`).
5. To grant admin: update the row in *Table Editor → profiles* (or run `update profiles set role='admin' where email='…';` in the SQL editor).

To reset a session on-device: erase the simulator (*Device → Erase All Content and Settings…*) or sign out from Settings. To wipe an account entirely: delete the user in the Supabase dashboard (Auth → Users) — the profile row cascades.

---

## Role & Visibility Model

Two roles: **`admin`** and **`user`**. Supervision and observation are recorded **per record**, not per account.

`src/services/AuthScope.ts` defines:

```ts
scopedWhere()         // admin → 1=1; user → owner_id = ?
caseScopedWhere()     // admin → 1=1;
                      // user  → (owner_id = ? OR supervisor_user_id = ? OR observer_user_id = ?)
procedureScopedWhere()// same
```

Every local SQL read interpolates one of these. Postgres RLS enforces the same shape on the server, so a non-admin user physically cannot read rows they aren't entitled to even with a hand-crafted client.

**Edits**: the owner of a record (and any admin) sees an Edit button on that record. Other users — including the supervisor or observer — cannot edit. Supervisors can only **approve / revoke approval**, not change content.

---

## Sync Architecture

Two-way sync runs:

- After every local write (fire-and-forget from the stores)
- When the user taps **Sync Now** in Settings

Pipeline:

1. **Push.** All rows where `synced = 0` are upserted to Supabase. Soft-deleted rows (`deleted_at IS NOT NULL`) are pushed the same way — Postgres just persists the tombstone, and other clients learn about the delete on their next pull. On success, the local row is marked `synced = 1` and its `server_updated_at` is stored.
2. **Pull.** Rows whose `server_updated_at > last_pull_watermark` are fetched and `INSERT OR REPLACE`d into local SQLite.
3. **Conflict.** If a row arrives in step 2 but the local copy has unsynced edits, we set `conflict = 1` and leave the local row alone. The user can resolve manually (last-writer-wins by default).

**Offline-only mode** (Settings → toggle) short-circuits the sync entirely. No network calls, no profile reads, no upserts. Useful for trainees who want a pure local logbook with zero cloud footprint.

### What happens if you log offline, then sync later?

- On the device you logged on, every record sits with `synced = 0`. The next push uploads them all.
- If a web/other-device user **also edited the same row** before you came back online, the most recent `updated_at` wins. The losing side's row is marked `conflict = 1` and surfaced in the UI (Settings → Sync panel will show a non-zero conflict count once that UI lands).
- If you only **created** new records offline and the web user only **created** other records, there is no conflict — both sets land on Supabase and pull down to each other on the next sync.
- A delete is always a soft-delete (a tombstone with `deleted_at`). It propagates like any other update, so you can't accidentally lose data because of a stale device.

### Demo script

1. **Sign up** on the app → auto-admin → log a case while online → confirm it appears in the Supabase Table Editor (`case_logs`).
2. **Toggle Offline-only** in Settings. Add another case. Note the *X pending upload* badge stays.
3. **Toggle Offline-only off.** Tap *Sync Now*. The pending count drops to 0; the new case appears in Supabase.
4. **Edit the same case from the dashboard** (Supabase Table Editor — change the diagnosis text). Back in the app, tap *Sync Now*. The change pulls down.
5. **Forget to sync** — set Offline-only on, edit a case, then on a second device (or in the dashboard) edit the same case differently. Toggle Offline-only off, tap *Sync Now*. The row is marked `conflict = 1`; the local edit is preserved and you decide whether to overwrite.

---

## Database Migrations

Open `src/database/migrations.ts`, append a new entry to the `MIGRATIONS` array, never edit existing ones — devices on a lower version will fail to reach yours.

SQLite cannot `ALTER TABLE ... DROP COLUMN`. For destructive changes use the rebuild pattern: `CREATE TABLE foo_new …; INSERT INTO foo_new SELECT … FROM foo; DROP TABLE foo; ALTER TABLE foo_new RENAME TO foo;`.

For Supabase schema changes, write a new migration in the dashboard's SQL editor (or via the MCP `apply_migration` tool) and bump the local schema in lockstep.

---

## Adding AI Summaries

1. Create `src/services/AIService.ts`.
2. Call the Claude API via a **Supabase Edge Function** (never from the client — exposes your API key).
3. Replace the template `Alert.alert(...)` in `handleAISummary` (CaseDetailScreen) with the real response.

See [PRODUCTION_ROADMAP.md §7.1](PRODUCTION_ROADMAP.md#71-real-ai-summaries) for the full Edge Function sketch.

---

## Known Limitations

- No date picker — users type YYYY-MM-DD manually.
- Conflicts surface as a per-row flag but there's no dedicated resolution UI yet (last-writer-wins until you build one).
- Creating users / resetting passwords / deleting users from the app is routed through the `admin-users` Edge Function in `supabase/functions/admin-users/`. Deploy it with:

  ```bash
  supabase functions deploy admin-users --no-verify-jwt
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... SUPABASE_URL=...
  ```

  The function verifies the caller's JWT has `app_metadata.role = 'admin'` before touching the admin API, so the service-role key never leaves Supabase's infrastructure.

- Audit logging is in `supabase/migrations/20260420000001_audit_log.sql`. It creates an append-only `audit_log` table with triggers on `case_logs` and `procedure_logs`. Apply it from the dashboard SQL editor or via `supabase db push`. Admins can query the full log; non-admin users can only read audit rows they own.
- No PDF/CSV export (FHIR / openEHR / JSON-LD exports exist; see `ExportScreen`).

See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for the full path to production.
