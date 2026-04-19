# ICU Logbook — Setup & Extension Guide

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Expo
npx expo start

# Then press:
#   i → iOS Simulator
#   a → Android Emulator
#   Scan QR code → Expo Go on physical device
```

On first launch the app opens both SQLite databases, runs all migrations, and — because the server DB has zero accounts — routes you to the **First-Run Setup** screen to create the initial admin.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio + emulator

---

## Project Structure

```
/
├── App.tsx                        Root component — DB init + consent/auth hydrate + navigation
├── src/
│   ├── models/                    TypeScript types + Zod schemas
│   │   ├── CaseLog.ts
│   │   └── ProcedureLog.ts
│   ├── database/
│   │   ├── client.native.ts       Local cache DB (icu_logbook.db)
│   │   ├── migrations.ts          v1 → v5 local schema migrations
│   │   ├── serverClient.native.ts Mock remote DB (icu_logbook_server.db)
│   │   └── serverMigrations.ts    v1 → v2 server schema migrations
│   ├── services/
│   │   ├── DataService.ts         IDataService + ISyncService interfaces
│   │   ├── CaseService.ts         CRUD + derived queries for cases (owner-scoped)
│   │   ├── ProcedureService.ts    CRUD + derived queries for procedures (owner-scoped)
│   │   ├── AuthService.ts         signIn, signOut, restoreSession, hasAnyUser,
│   │   │                          createFirstAdmin, user CRUD, getUserDirectory
│   │   ├── AuthScope.ts           SQL WHERE fragments for visibility rules
│   │   ├── passwordHash.ts        Salt/hash/verify helpers
│   │   └── SyncService.ts         Stub — replace with real backend client
│   ├── store/
│   │   ├── authStore.ts           Session + role + needsInitialSetup
│   │   ├── caseStore.ts           Cases + stats
│   │   ├── procedureStore.ts      Procedures + stats
│   │   ├── consentStore.ts        Four-way data-sharing consent
│   │   └── syncStore.ts           Sync state
│   ├── components/                Reusable UI primitives (Button, Card, UserPicker…)
│   ├── screens/                   One file per screen
│   │   ├── FirstRunSetupScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── AdminPanelScreen.tsx
│   │   └── …
│   ├── navigation/                React Navigation setup + types
│   └── utils/                     constants, dateUtils, uuid
```

---

## Schema Overview

### Local cache (`icu_logbook.db`)

| Table | Purpose |
|---|---|
| `schema_version` | Single-row migration tracker |
| `case_logs` | Offline copy of cases, with `owner_id`, `supervisor_user_id`, `observer_user_id`, `synced` |
| `procedure_logs` | Offline copy of procedures, with the same three user columns |
| `app_settings` | Key/value store (session token, device ID, consent status) |

Migrations (additive, never edited):

- **v1** — base `case_logs` / `procedure_logs` tables
- **v2** — FAIR/semantic layer (coded JSON, provenance, quality, consent, license)
- **v3** — `owner_id` on both tables
- **v4** — `supervisor_user_id` + `observer_user_id` on `case_logs`
- **v5** — `supervisor_user_id` + `observer_user_id` on `procedure_logs`

### Mock server (`icu_logbook_server.db`)

| Table | Purpose |
|---|---|
| `schema_version` | Migration tracker |
| `users` | Account records: id, email (unique), display_name, role (`admin` \| `user`), password_hash, password_salt, disabled |
| `sessions` | 30-day session tokens bound to a user id |

Migrations:

- **v1** — base `users` + `sessions` tables (roles `admin`, `supervisor`, `trainee`)
- **v2** — rebuild `users` with `CHECK (role IN ('admin','user'))`, remapping legacy `supervisor` / `trainee` to `user`

---

## Authentication & First-Run Flow

The app **no longer seeds a demo admin**. On boot:

1. `initializeServerDatabase()` opens `icu_logbook_server.db` and runs server migrations.
2. `authStore.restore()` calls `restoreSession()`; if there's no valid cached token it falls back to checking `hasAnyUser()`.
3. If zero users exist, `needsInitialSetup = true` and the navigator routes to `FirstRunSetupScreen`.
4. The setup form calls `createFirstAdmin({ email, displayName, password })` in `AuthService.ts`. That helper refuses to run if any user already exists, then creates an `admin` row and signs them in.
5. Once an admin exists, all further account creation happens through **Admin Panel → Create User** (email, display name, password, role: `user` or `admin`).

**To reset to first-run setup:** erase the simulator (*Device → Erase All Content and Settings…*) or delete + reinstall the Expo Go / dev-client app. Both SQLite files live inside the app sandbox, so uninstalling removes everything.

---

## Role & Visibility Model

Two account roles only: **`admin`** and **`user`**. There is no separate supervisor or trainee account — supervision and observation are recorded **per record** via the **Supervised by** / **Observed by** pickers on the case and procedure forms.

Visibility is enforced at the SQL layer by two helpers in `src/services/AuthScope.ts`:

```ts
scopedWhere()         // admin → 1=1; user → owner_id = ?
caseScopedWhere()     // admin → 1=1;
                      // user  → (owner_id = ? OR supervisor_user_id = ? OR observer_user_id = ?)
procedureScopedWhere()// same as case scope
```

Every read in `CaseService` and `ProcedureService` interpolates one of these into the `WHERE` clause, so a non-admin user physically cannot read rows they aren't entitled to, regardless of what the UI does.

Ownership is also used to gate destructive actions: **Case Detail** only shows the Delete button when `caseLog.ownerId === userId`.

---

## Adding a Real Supabase Backend

The service layer is designed so that swapping the mock for real Supabase is a single-file change per service.

### Step 1 — Install the client

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

### Step 2 — Replace `AuthService.ts`

All auth and user-management calls go through `src/services/AuthService.ts`. Replace the bodies of:

- `signIn`, `restoreSession`, `signOut`
- `listUsers`, `createUser`, `updateUserRole`, `setUserDisabled`, `resetUserPassword`, `deleteUser`
- `getUserDirectory`
- `hasAnyUser`, `createFirstAdmin`

…with Supabase Auth / RPC calls. Every screen and store reads through this file, so no other code needs to change. Decide early whether `createFirstAdmin` stays (self-hosted deployments) or is stripped out (cloud deployments where admin is seeded via the Supabase dashboard).

### Step 3 — Mirror the schema in Postgres

Create `users`, `case_logs`, and `procedure_logs` tables with the same columns, including `owner_id`, `supervisor_user_id`, `observer_user_id`. Add Row-Level Security policies that mirror `AuthScope.ts`:

```sql
-- Cases: admin sees all, user sees own + supervised + observed
CREATE POLICY cases_select ON case_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR owner_id = auth.uid()
  OR supervisor_user_id = auth.uid()
  OR observer_user_id = auth.uid()
);
```

### Step 4 — Replace `SyncService.ts`

Implement `syncPending()` so it reads `WHERE synced = 0` locally, upserts to Supabase, then marks rows synced. Include `owner_id`, `supervisor_user_id`, `observer_user_id` in the upsert payload.

### Step 5 — Environment variables

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add `.env` to `.gitignore`.

---

## Adding AI Summaries

The reflection field and case data feed directly into an AI summary feature:

1. Create `src/services/AIService.ts`
2. Call the Claude API via a server-side proxy (never from the client — exposes your API key)
3. Replace the template `Alert.alert(...)` in `handleAISummary` in `CaseDetailScreen.tsx` with the real response

See [PRODUCTION_ROADMAP.md §7.1](PRODUCTION_ROADMAP.md#71-real-ai-summaries) for the full Edge Function sketch.

---

## Database Migrations

Both DBs use the same pattern:

1. Open `src/database/migrations.ts` or `serverMigrations.ts`
2. Append a new entry to the `MIGRATIONS` array with the next version number
3. **Never edit existing entries** — devices on a lower version will fail to reach yours

SQLite cannot `ALTER TABLE ... DROP COLUMN` or `DROP CHECK`, so for destructive changes you must use the rebuild pattern: `CREATE TABLE users_new …; INSERT INTO users_new SELECT … FROM users; DROP TABLE users; ALTER TABLE users_new RENAME TO users;`. The server v2 migration uses this pattern to collapse the role enum.

---

## Sync Architecture Notes

- Every record has `synced: boolean` (stored as INTEGER 0/1 in SQLite)
- `created_at` / `updated_at` are ISO strings for conflict resolution
- On sync, use `updated_at` as the server-side "last writer wins" signal
- For stronger consistency, add a `server_updated_at` column later
- Supervisor / observer IDs must be included in the sync payload so the server can enforce visibility via RLS

---

## Known Limitations (MVP)

- No date picker — users type YYYY-MM-DD manually
- No edit screen for existing cases (delete and re-log)
- No PDF/CSV data export (FHIR / openEHR / JSON-LD exports exist; see `ExportScreen`)
- Sync target is a stub
- "Real" auth is local-only — the `users` table lives in a second SQLite file, not a remote server. Swap the auth service to Supabase to go live.
- No supervisor approval / countersign workflow — the pickers record who supervised / observed, but there's no "approved by" state yet.

All of these are intentional scope decisions for the pilot phase. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for the full path to production.
