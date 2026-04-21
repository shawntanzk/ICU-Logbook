# Production Roadmap

This document describes everything required to take ICU Logbook from the current MVP state to a production-ready clinical app. Each section includes **what needs to be done**, **why it matters**, and **how to do it** — written so both developers and non-technical stakeholders can follow.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Phase 1 — Core Infrastructure (weeks 1–3)](#2-phase-1--core-infrastructure-weeks-13)
   - 2.1 Real Authentication
   - 2.2 Real Cloud Backend (Supabase)
   - 2.3 Proper Sync Engine
3. [Phase 2 — Clinical Features (weeks 4–6)](#3-phase-2--clinical-features-weeks-46)
   - 3.1 Edit Existing Records
   - 3.2 Date Picker
   - 3.3 Data Export (PDF / CSV)
   - 3.4 Supervisor Case Review & Sign-Off
   - 3.5 Notifications & Reminders
4. [Phase 3 — Compliance & Security (weeks 7–9)](#4-phase-3--compliance--security-weeks-79)
   - 4.1 Data Encryption at Rest
   - 4.2 HIPAA / GDPR Compliance
   - 4.3 Audit Logging
   - 4.4 Session Management & Token Security
5. [Phase 4 — Quality & Reliability (weeks 10–12)](#5-phase-4--quality--reliability-weeks-1012)
   - 5.1 Automated Testing
   - 5.2 Error Tracking & Crash Reporting
   - 5.3 Analytics
   - 5.4 Performance Optimisation
6. [Phase 5 — App Store Submission](#6-phase-5--app-store-submission)
   - 6.1 iOS (App Store)
   - 6.2 Android (Google Play)
7. [Phase 6 — AI Features](#7-phase-6--ai-features)
   - 7.1 Real AI Summaries
   - 7.2 AI-Assisted Domain Tagging
   - 7.3 Progress Insights
8. [Infrastructure & DevOps](#8-infrastructure--devops)
9. [Team & Roles Required](#9-team--roles-required)
10. [Estimated Timeline](#10-estimated-timeline)
11. [Risk Register](#11-risk-register)
12. [Definition of "Production Ready"](#12-definition-of-production-ready)

---

## 1. Current State Summary

### What is working right now

| Feature | Status | Notes |
|---|---|---|
| Case logging form | ✅ Working | Full validation, saves locally; supervisor/observer pickers |
| Procedure logging form | ✅ Working | Links to cases, saves locally; supervisor/observer pickers |
| Dashboard with stats | ✅ Working | Real data, admin vs user styling |
| Case list with search | ✅ Working | Owner + relation badges, filterable |
| Competency heatmap | ✅ Working | All 12 CoBaTrICE domains |
| AI summary (mock) | ✅ Working | Hardcoded template, ready for API |
| Offline storage | ✅ Working | SQLite via expo-sqlite |
| **Authentication** | ✅ Supabase | `supabase.auth` with AsyncStorage-persisted sessions, auto-refresh, password login. |
| **First-run admin setup** | ✅ Working | `FirstRunSetupScreen` calls `supabase.auth.signUp`; the `handle_new_user` trigger auto-promotes the first profile to `admin`. |
| **User management** | ✅ Partial | Admins can role-toggle and disable accounts from the app. Creating users, resetting passwords, and deleting users requires the Supabase dashboard (service-role only). |
| **Role model** | ✅ Working | Two roles only: `admin` and `user`. Supervision/observation recorded per record. |
| **Owner-scoped visibility** | ✅ Working | `AuthScope.ts` fragments locally; matching RLS policies on Supabase. Admin sees all; user sees own + supervised + observed. |
| **Approval workflow** | ✅ Working | Tagged supervisor can approve / revoke. Changing the supervisor invalidates approval. External (off-system) supervisor names supported for display. |
| **Edit records** | ✅ Working | Owner or admin edits cases and procedures via dedicated edit screens. |
| Consent + FAIR exports | ✅ Working | Four-way consent; FHIR / openEHR / JSON-LD exports |
| **Cloud sync** | ✅ Two-way | Push + pull against Supabase on every write and via *Sync Now*. Soft-delete tombstones propagate. Conflicts flagged with `conflict = 1` on the local row. |
| **Offline-only mode** | ✅ Working | Settings toggle. Short-circuits all sync; no network calls. |

### What is mocked or missing

| Feature | Current State | What is needed |
|---|---|---|
| Admin user creation | Throws from the mobile client | Admin Edge Function (service-role) or stay on the Supabase dashboard |
| Password reset / delete user | Throws from the mobile client | Same — admin Edge Function |
| Conflict resolution UI | Conflicting rows are flagged; default is last-writer-wins | Dedicated UI to show conflicted rows and pick a winner |
| Password policy | Minimum 6 chars, no complexity rules | Stronger policy, breach-password check, optional MFA |
| Session security | Supabase session in AsyncStorage | Move to Expo SecureStore, 15-min inactivity auto-logout, biometric re-auth |
| Data export | FHIR / openEHR / JSON-LD exist; no PDF/CSV | PDF/CSV generation for ARCP panels |
| Date input | Text field (YYYY-MM-DD) | Native date picker |
| Notifications | Not implemented | Reminder to log daily/weekly |
| Encryption | None | At-rest encryption on local SQLite |
| Testing | None | Unit and integration tests |
| App store | Not submitted | Icons, store listings, privacy policy |

---

## 2. Phase 1 — Core Infrastructure (largely done)

**Status:** the bulk of Phase 1 has landed. Supabase Auth, a Postgres schema mirroring local SQLite, RLS policies matching `AuthScope.ts`, two-way sync, soft deletes, approval workflow, and owner/admin edit are all in place. What remains is operational hardening — admin Edge Function, stronger session security, conflict-resolution UI, and encryption at rest.

---

### 2.1 Migrate Auth from Local Mock to Supabase

**Current state:** Email + password authentication is already working against a **local** SQLite file (`icu_logbook_server.db`). Passwords are salted and hashed; sessions are bound to a `sessions` table; restore-on-launch works. What's missing is the remote part — every device has its own private auth store, so accounts don't roam.

**Why it matters:** Users need to sign in on any device with the same credentials, admins need central control of the account list, and session revocation must be authoritative across devices. A local-only auth store can't deliver any of that.

**What to implement:**

1. **Supabase Auth** — email/password login with secure session tokens (replacing the local `sessions` table)
2. **Persistent sessions** — already works locally; switch the storage backend to AsyncStorage + Supabase session refresh
3. **Password reset** — "Forgot password" email flow (not possible in the local mock)
4. **Logout on session expiry** — auto-logout after inactivity
5. **Decide on first-run setup** — the `FirstRunSetupScreen` assumes zero-users triggers admin creation. For hosted deployments, either remove the screen behind a build flag, or keep it for self-hosted installs. For hosted, seed the first admin via the Supabase dashboard instead.

**How to do it:**

```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

Create `src/services/AuthService.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

export const AuthService = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),
};
```

The existing `LoginScreen.tsx` already collects email + password and calls through `useAuthStore().signIn` → `AuthService.signIn`. Migration is a one-file change: replace the bodies of the six exports in `AuthService.ts` (`signIn`, `restoreSession`, `signOut`, `listUsers`, `createUser`, `updateUserRole`, `setUserDisabled`, `resetUserPassword`, `deleteUser`, `hasAnyUser`, `createFirstAdmin`, `getUserDirectory`) with Supabase calls. No screen or store code needs to change.

**Role model:** the app uses two roles only — `admin` and `user`. Supervision/observation is per record (via `supervisor_user_id` / `observer_user_id`), not per account. Replicate this in Supabase: a `profiles` table with `role` ∈ {`admin`, `user`}, plus the two ID columns on `case_logs` and `procedure_logs`.

**Security note:** In production, role assignment must be server-side. A user should not be able to grant themselves admin status by modifying the app. Roles should be stored in the Supabase `profiles` table and enforced via Row-Level Security policies that mirror `src/services/AuthScope.ts`.

---

### 2.2 Real Cloud Backend (Supabase)

**Status:** done. This section is retained as reference for self-hosted / alternative deployments.

**How to set up Supabase:**

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project — choose a region close to your users
3. Go to **SQL Editor** and run the following schema:

```sql
-- User profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  hospital    TEXT,
  disabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Case logs
CREATE TABLE case_logs (
  id                    UUID PRIMARY KEY,
  owner_id              UUID NOT NULL REFERENCES profiles(id),
  supervisor_user_id    UUID REFERENCES profiles(id),
  observer_user_id      UUID REFERENCES profiles(id),
  date                  DATE NOT NULL,
  diagnosis             TEXT NOT NULL,
  icd10_code            TEXT,
  organ_systems         TEXT[] NOT NULL DEFAULT '{}',
  cobatrice_domains     TEXT[] NOT NULL DEFAULT '{}',
  supervision_level     TEXT NOT NULL,
  reflection            TEXT,
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL
);

-- Procedure logs (same visibility columns as cases)
CREATE TABLE procedure_logs (
  id                    UUID PRIMARY KEY,
  owner_id              UUID NOT NULL REFERENCES profiles(id),
  supervisor_user_id    UUID REFERENCES profiles(id),
  observer_user_id      UUID REFERENCES profiles(id),
  case_id               UUID REFERENCES case_logs(id) ON DELETE SET NULL,
  procedure_type        TEXT NOT NULL,
  attempts              INTEGER NOT NULL,
  success               BOOLEAN NOT NULL,
  complications         TEXT,
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL
);

-- Helper function: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;

-- Row-Level Security: mirror AuthScope.ts
ALTER TABLE case_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cases_visible ON case_logs FOR SELECT USING (
  is_admin()
  OR owner_id = auth.uid()
  OR supervisor_user_id = auth.uid()
  OR observer_user_id = auth.uid()
);
CREATE POLICY cases_insert ON case_logs FOR INSERT WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY cases_update ON case_logs FOR UPDATE USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY cases_delete ON case_logs FOR DELETE USING (owner_id = auth.uid() OR is_admin());

ALTER TABLE procedure_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY procs_visible ON procedure_logs FOR SELECT USING (
  is_admin()
  OR owner_id = auth.uid()
  OR supervisor_user_id = auth.uid()
  OR observer_user_id = auth.uid()
);
-- repeat insert/update/delete as above
```

4. In your Supabase project, go to **Settings → API** and copy your **Project URL** and **anon/public key**

5. Create `.env` in the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. Add `.env` to `.gitignore` — never commit secrets to version control

7. Replace `src/services/supabase.ts` with the real client:
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

### 2.3 Proper Sync Engine

**Why it matters:** The current sync marks records as synced locally even if the upload fails (simulated). A real sync engine needs to handle network failures, retries, and conflicts.

**What to implement:**

Replace `src/services/SyncService.ts` with a robust implementation:

```typescript
async syncPending(): Promise<SyncResult> {
  const db = await getDatabase();
  const session = await supabase.auth.getSession();
  if (!session.data.session) throw new Error('Not authenticated');

  const userId = session.data.session.user.id;

  const unsyncedCases = await db.getAllAsync<CaseRow>(
    'SELECT * FROM case_logs WHERE synced = 0'
  );

  if (unsyncedCases.length > 0) {
    const rows = unsyncedCases.map(row => ({
      ...rowToSupabaseFormat(row),
      owner_id: row.owner_id ?? userId,
      supervisor_user_id: row.supervisor_user_id ?? null,
      observer_user_id: row.observer_user_id ?? null,
    }));

    const { error } = await supabase.from('case_logs').upsert(rows);
    if (error) throw new Error(error.message);

    await db.execAsync('UPDATE case_logs SET synced = 1 WHERE synced = 0');
  }

  // Repeat for procedure_logs...

  return { synced: unsyncedCases.length, failed: 0, pending: 0 };
}
```

**Additional sync features to add:**

- **Background sync** — auto-sync when the app comes online using `NetInfo` from `@react-native-community/netinfo`
- **Retry on failure** — exponential backoff if the network fails mid-sync
- **Conflict resolution** — for multi-device support: compare `updated_at` timestamps and take the newer record as the truth
- **Sync indicator in header** — small icon showing online/offline/syncing state

---

## 3. Phase 2 — Clinical Features (weeks 4–6)

---

### 3.1 Edit Existing Records

**Why it matters:** Trainees make mistakes. Locking records as immutable after creation is frustrating and leads to duplicate entries.

**What to add:**

1. Add an **Edit** button to `CaseDetailScreen.tsx` (trainees only)
2. Create `src/screens/EditCaseScreen.tsx` — same form as AddCaseScreen, pre-populated with existing data
3. Call `CaseService.update(id, input)` on save (this method already exists)
4. Add the screen to `CasesStackParamList` in `src/navigation/types.ts`

---

### 3.2 Date Picker

**Why it matters:** Typing dates manually (YYYY-MM-DD) is error-prone and not how people expect mobile apps to work.

**What to add:**

```bash
npx expo install @react-native-community/datetimepicker
```

Replace the text input in `AddCaseScreen.tsx` and `EditCaseScreen.tsx` with:

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';

<DateTimePicker
  value={new Date(form.date)}
  mode="date"
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  onChange={(_, date) => date && update('date', dayjs(date).format('YYYY-MM-DD'))}
/>
```

---

### 3.3 Data Export (PDF / CSV)

**Why it matters:** Training programmes, ARCP panels, and regulatory bodies require paper or PDF evidence of logbooks. This is a critical feature for clinical adoption.

**What to add:**

```bash
npx expo install expo-print expo-sharing expo-file-system
```

Create `src/services/ExportService.ts`:

```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportCasesToPDF(cases: CaseLog[]): Promise<void> {
  const html = generateHTML(cases); // build HTML table of cases
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}

export function exportCasesToCSV(cases: CaseLog[]): string {
  const headers = ['Date', 'Diagnosis', 'ICD-10', 'Supervision', 'Domains'];
  const rows = cases.map(c => [
    c.date, c.diagnosis, c.icd10Code ?? '',
    c.supervisionLevel, c.cobatriceDomains.join(';')
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}
```

Wire this to the **Export Data** button in `SettingsScreen.tsx`.

---

### 3.4 Supervisor Case Review & Sign-Off

**Why it matters:** In formal training programmes, supervisors must countersign logbook entries. This is the core value of a digital logbook over paper.

**Current state:** Every case and procedure already carries a `supervisor_user_id` and `observer_user_id` (see migrations v4 / v5). The supervisor can *see* the record — there's just no approval state on top of it yet.

**What to build:**

1. A `supervisor_reviews` table in Supabase:
   ```sql
   CREATE TABLE supervisor_reviews (
     id            UUID PRIMARY KEY,
     case_id       UUID NOT NULL REFERENCES case_logs(id),
     supervisor_id UUID NOT NULL REFERENCES profiles(id),
     status        TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
     comment       TEXT,
     reviewed_at   TIMESTAMPTZ
   );
   ```
2. A **Request Review** button on `CaseDetailScreen.tsx` (owner) that creates a `supervisor_reviews` row with `supervisor_id = case.supervisor_user_id` and `status = 'pending'`
3. A **Reviews inbox** screen listing the signed-in user's pending rows (`WHERE supervisor_id = auth.uid() AND status = 'pending'`)
4. **Approve / Reject** actions with optional comment, surfacing the result back in the owner's case detail view

No join table is needed — the per-record `supervisor_user_id` already identifies who should review. An RLS policy on `supervisor_reviews` using `supervisor_id = auth.uid() OR EXISTS (… case.owner_id = auth.uid() …)` covers both sides.

---

### 3.5 Notifications & Reminders

**Why it matters:** Trainees forget to log cases at the end of a busy shift. A daily reminder significantly improves data completeness.

```bash
npx expo install expo-notifications
```

Schedule a daily reminder at a user-configurable time:

```typescript
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: "ICU Logbook reminder",
    body: "Don't forget to log today's cases!",
  },
  trigger: {
    hour: 18,
    minute: 0,
    repeats: true,
  },
});
```

Add a notification settings section to `SettingsScreen.tsx`.

---

## 4. Phase 3 — Compliance & Security (weeks 7–9)

This phase is **mandatory before any real patient data is stored**, even de-identified data.

---

### 4.1 Data Encryption at Rest

**Why it matters:** If a phone is lost or stolen, patient data (even de-identified) in an unencrypted database can be read by anyone with basic tools. This applies to the local SQLite cache.

**What to implement:**

Replace `expo-sqlite` with the encrypted variant for `icu_logbook.db`:

1. Update `app.json`:
   ```json
   ["expo-sqlite", { "useSQLCipher": true }]
   ```

2. Update `src/database/client.ts` to pass an encryption key:
   ```typescript
   const db = await SQLite.openDatabaseAsync('icu_logbook.db', {
     key: await getEncryptionKey(), // retrieve from secure storage
   });
   ```

3. Store the encryption key in the device's secure enclave:
   ```bash
   npx expo install expo-secure-store
   ```
   ```typescript
   import * as SecureStore from 'expo-secure-store';

   async function getEncryptionKey(): Promise<string> {
     let key = await SecureStore.getItemAsync('db_key');
     if (!key) {
       key = generateRandomKey(32);
       await SecureStore.setItemAsync('db_key', key);
     }
     return key;
   }
   ```

> Note: `expo-sqlite` with SQLCipher requires a custom Expo development build (not Expo Go). See the Expo docs on [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

---

### 4.2 HIPAA / GDPR Compliance

**Why it matters:** Medical data is regulated in every jurisdiction. In the UK, it falls under GDPR and NHS data governance standards. In the US, HIPAA applies. Non-compliance can result in fines and loss of clinical accreditation.

**Action items:**

| Requirement | Action |
|---|---|
| De-identification | The app stores diagnoses (which can indirectly identify patients). Assess whether the combination of date, diagnosis, and ICD-10 code constitutes identifiable data for your use case. |
| Data Processing Agreement | Sign a DPA with Supabase (available for Pro plans). |
| Data residency | Configure Supabase to host data in the same jurisdiction as your users (e.g. EU region for UK/European hospitals). |
| Right to erasure | Implement a "Delete my account" flow that removes all data from both the device and Supabase. |
| Privacy policy | Write and display a privacy policy before first use. Link it from the app store listing. |
| Data minimisation | Only collect fields that are clinically necessary. Review each form field. |
| Consent | Show a consent screen on first launch explaining what data is collected and why. |
| Breach notification | Establish a process to notify users within 72 hours if a data breach occurs (GDPR requirement). |

**For NHS deployment**, consult your trust's Information Governance team and the [NHS Data Security and Protection Toolkit](https://www.dsptoolkit.nhs.uk/) before piloting with real patients.

---

### 4.3 Audit Logging

**Why it matters:** In regulated environments, you must be able to prove who accessed or modified data, and when.

**What to add:**

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,  -- 'create', 'update', 'delete', 'view'
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);
```

Log all create, update, and delete operations in the service layer. This can be done server-side via Supabase Database Webhooks or Edge Functions to prevent client-side tampering.

---

### 4.4 Session Management & Token Security

**Why it matters:** Stolen or reused authentication tokens can give attackers access to clinical data.

**What to implement:**

- Auto-logout after **15 minutes** of inactivity (standard for clinical systems)
- Require PIN or biometric re-authentication to resume session
- Invalidate all sessions on password change
- Implement **certificate pinning** to prevent man-in-the-middle attacks (advanced)

```bash
npx expo install expo-local-authentication
```

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Verify your identity to continue',
  fallbackLabel: 'Use PIN',
});
if (!result.success) signOut();
```

---

## 5. Phase 4 — Quality & Reliability (weeks 10–12)

---

### 5.1 Automated Testing

**Why it matters:** Without tests, every change risks breaking existing features. In a clinical context, bugs have patient safety implications.

**Install testing tools:**

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

**What to test:**

| Test type | What to cover | File locations |
|---|---|---|
| **Unit tests** | Zod validation schemas, date utils, UUID generator | `__tests__/models/`, `__tests__/utils/` |
| **Service tests** | CaseService CRUD, ProcedureService CRUD, SyncService logic | `__tests__/services/` |
| **Component tests** | Form validation rendering, MultiSelect toggle behaviour | `__tests__/components/` |
| **Integration tests** | Full login → add case → view case → sync flow | `__tests__/flows/` |
| **E2E tests** | Full app flows on real device / simulator | Use Detox |

**Example unit test (models):**

```typescript
// __tests__/models/CaseLog.test.ts
import { CaseLogSchema } from '../../src/models/CaseLog';

test('rejects missing diagnosis', () => {
  const result = CaseLogSchema.safeParse({
    date: '2026-04-17',
    diagnosis: '',
    organSystems: ['resp'],
    cobatriceDomains: ['d1'],
    supervisionLevel: 'supervised',
  });
  expect(result.success).toBe(false);
});
```

**Minimum coverage target for production:** 80% of service layer, 60% of components.

---

### 5.2 Error Tracking & Crash Reporting

**Why it matters:** Users will encounter bugs in production that never appeared in testing. Without error tracking, you will not know about them.

```bash
npx expo install @sentry/react-native
```

In `App.tsx`:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.EXPO_PUBLIC_ENV,
});
```

This automatically captures unhandled exceptions and sends them to a dashboard where you can see:
- Which users are affected
- The full error stack trace
- Device type and OS version

---

### 5.3 Analytics

**Why it matters:** You need to know which features are actually being used to make informed decisions about where to invest development time.

**Recommended tool:** PostHog (open-source, GDPR-compliant, can self-host)

```bash
npm install posthog-react-native
```

Track events like:
- `case_logged` (with domain count and supervision level — no patient data)
- `sync_triggered`
- `competency_map_viewed`
- `ai_summary_requested`

**Do not track any patient data or free-text fields.**

---

### 5.4 Performance Optimisation

For a pilot with fewer than 1,000 records, performance is not a concern. At scale, consider:

- **Pagination** — `CaseListScreen` loads all cases; add `LIMIT` and `OFFSET` to SQL queries for large datasets
- **Memoisation** — wrap `FlatList` item renderers in `React.memo()` to prevent unnecessary re-renders
- **Index the date column** — add `CREATE INDEX idx_case_date ON case_logs(date)` in a migration
- **Background sync** — run sync in a background task so it does not block the UI

---

## 6. Phase 5 — App Store Submission

---

### 6.1 iOS (App Store)

**Requirements:**

1. **Apple Developer account** — costs $99/year at [developer.apple.com](https://developer.apple.com)
2. **App icons** — all required sizes generated from a single 1024×1024px source image
3. **Splash screen** — replace placeholder in `assets/`
4. **Privacy policy URL** — required for medical apps
5. **App Store description** and screenshots
6. **Medical app category** — review Apple's guidelines for health and medical apps
7. **Export compliance** — declare whether the app uses encryption (yes, if you add SQLCipher and HTTPS)

**Build command:**

```bash
npx eas build --platform ios --profile production
```

(Requires EAS — Expo Application Services. Run `npm install -g eas-cli` and `eas login` first.)

**Submission:**

```bash
npx eas submit --platform ios
```

**Review time:** 1–3 days. Medical apps may require additional review.

---

### 6.2 Android (Google Play)

**Requirements:**

1. **Google Play Developer account** — one-time $25 fee at [play.google.com/console](https://play.google.com/console)
2. **Data safety form** — declare what data the app collects
3. **Target API level** — must meet Google's current requirements (API 34+ as of 2025)
4. **App bundle** — submit as `.aab` format, not `.apk`

**Build command:**

```bash
npx eas build --platform android --profile production
```

**Submission:**

```bash
npx eas submit --platform android
```

---

## 7. Phase 6 — AI Features

---

### 7.1 Real AI Summaries

**Current state:** The "AI Clinical Summary" button generates a template string from case fields.

**What to add:**

1. Create a backend Edge Function in Supabase (or a separate API server) that calls the Anthropic Claude API. **Never call AI APIs directly from the mobile client** — it would expose your API key.

2. Supabase Edge Function (`supabase/functions/summarise-case/index.ts`):

```typescript
import Anthropic from 'npm:@anthropic-ai/sdk';

const client = new Anthropic();

Deno.serve(async (req) => {
  const { caseLog } = await req.json();

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Summarise this ICU case in 3-4 sentences for a clinical logbook.
      Date: ${caseLog.date}
      Diagnosis: ${caseLog.diagnosis}
      ICD-10: ${caseLog.icd10Code}
      Organ systems: ${caseLog.organSystems.join(', ')}
      CoBaTrICE domains: ${caseLog.cobatriceDomains.join(', ')}
      Supervision: ${caseLog.supervisionLevel}
      Reflection: ${caseLog.reflection}

      Write in third-person clinical language. Focus on learning points.`
    }]
  });

  return new Response(
    JSON.stringify({ summary: message.content[0].text }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

3. Call from `src/services/AIService.ts`:

```typescript
export async function getCaseSummary(caseLog: CaseLog): Promise<string> {
  const { data, error } = await supabase.functions.invoke('summarise-case', {
    body: { caseLog },
  });
  if (error) throw error;
  return data.summary;
}
```

4. Replace the `Alert.alert` in `handleAISummary` with a proper modal that shows the streaming response.

---

### 7.2 AI-Assisted Domain Tagging

**What this does:** As a trainee types their diagnosis and reflection, the AI suggests which CoBaTrICE domains and organ systems are relevant — reducing the cognitive load of manual selection.

**How to implement:**

- On `AddCaseScreen`, add a "Suggest domains" button that appears after the diagnosis field is filled
- Call an Edge Function that receives the diagnosis text and returns suggested domain IDs
- Pre-select those chips in the MultiSelect components (user can still adjust)

---

### 7.3 Progress Insights

**What this does:** At the end of each month, generate a natural-language summary of the trainee's progress: which domains they've covered well, which are lacking, and suggested case types to seek out.

**How to implement:**

- A Supabase scheduled function (cron job) that runs monthly
- Aggregates the user's domain counts, procedure success rates, and supervision level distribution
- Calls Claude with this data and a prompt like: "You are a supportive ICU training supervisor. Write a 200-word progress summary for a trainee with the following case data..."
- Delivers the summary via push notification and stores it in a `progress_reports` table

---

## 8. Infrastructure & DevOps

### Environments

You need at least three environments to avoid testing against production data:

| Environment | Purpose | Supabase project |
|---|---|---|
| **Development** | Local development and testing | Your personal Supabase project |
| **Staging** | User acceptance testing, pre-release | Separate Supabase project |
| **Production** | Real users, live data | Separate Supabase project with backups |

Use different `.env` files for each:
- `.env.development`
- `.env.staging`
- `.env.production`

### CI/CD Pipeline

Set up automated checks that run every time code is pushed to GitHub:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npx tsc --noEmit  # TypeScript type check
```

### Database Backups

- Enable **Point-in-Time Recovery** in Supabase (Pro plan)
- Configure automated daily backups
- Test restoring from backup at least once before going live

### Monitoring

| Tool | What it monitors |
|---|---|
| Sentry | App crashes and errors |
| Supabase Dashboard | Database query performance, API errors |
| PostHog | Feature usage |
| UptimeRobot (free) | API availability |

---

## 9. Team & Roles Required

| Role | Responsibility | Time estimate |
|---|---|---|
| **Mobile developer** | React Native, TypeScript, Expo | Full-time for full roadmap |
| **Backend developer** | Supabase, SQL, Edge Functions | Part-time (2–3 days/week) |
| **Clinical lead** | Requirements validation, user testing | 4–8 hours/week |
| **Information Governance officer** | GDPR/HIPAA review, DPA | One-off engagement |
| **UI/UX designer** | App icons, refined screens, accessibility | 2–3 weeks |
| **QA tester** | Manual and automated testing | Part-time for Phase 4 |

---

## 10. Estimated Timeline

> These are rough estimates for a small team (2 developers + clinical input). Timelines vary significantly based on team size and scope.

| Phase | Content | Duration |
|---|---|---|
| Phase 1 | Migrate auth to Supabase, real sync (auth itself already works locally) | 2 weeks |
| Phase 2 | Edit records, export, supervisor sign-off | 3 weeks |
| Phase 3 | Encryption, GDPR, audit logging | 3 weeks |
| Phase 4 | Testing, monitoring, performance | 3 weeks |
| Phase 5 | App store submission | 1–2 weeks |
| Phase 6 | AI features | 2–4 weeks |
| **Total** | | **~15–17 weeks** |

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| App Store rejection (medical category) | Medium | High | Read Apple/Google medical app guidelines early; consult a healthcare app lawyer if needed |
| GDPR non-compliance discovered post-launch | Low | Very High | Engage IG officer in Phase 3; get DPA signed before any real data is collected |
| Data loss due to no backups | Low | Very High | Enable Supabase backups before Phase 1 goes live |
| Sync conflicts from multi-device use | Medium | Medium | Implement `updated_at` conflict resolution in Phase 1; document single-device expectation for pilot |
| Low trainee adoption due to UX friction | High | High | Run user testing sessions with 3–5 trainees before Phase 5; focus on the Add Case form |
| AI summary generates clinically incorrect content | Medium | High | Add a disclaimer; never auto-apply AI output; keep as "draft for review" |
| Encryption key loss locks users out of local data | Low | High | Tie encryption key to Supabase user ID, not device; allow key re-derivation on re-login |

---

## 12. Definition of "Production Ready"

The app is considered production-ready when all of the following are true:

### Security
- [ ] All data encrypted at rest on device
- [ ] All network traffic over HTTPS with certificate pinning
- [ ] Authentication uses real passwords with secure session tokens
- [ ] Session expires after 15 minutes of inactivity
- [ ] Roles enforced server-side (not just client-side)
- [ ] Audit log records all data access and modification

### Compliance
- [ ] GDPR Data Processing Agreement signed with Supabase
- [ ] Privacy policy published and shown to users at first launch
- [ ] Data residency confirmed in correct jurisdiction
- [ ] NHS Digital Security and Protection Toolkit (or local equivalent) assessment completed
- [ ] "Delete my account" flow implemented

### Reliability
- [ ] Automated test suite with ≥80% service layer coverage
- [ ] Crash reporting (Sentry) active in production
- [ ] Database backups verified and tested
- [ ] Staging environment mirrors production

### Clinical
- [ ] At least 10 trainees have completed a 2-week pilot
- [ ] Supervisor sign-off workflow implemented and tested
- [ ] PDF export working and formatted to training programme standards
- [ ] Clinical lead has reviewed and approved all CoBaTrICE domain mappings

### App Stores
- [ ] iOS App Store listing submitted and approved
- [ ] Android Google Play listing submitted and approved
- [ ] All required privacy labels and data safety forms complete
- [ ] App icon, splash screen, and screenshots professionally designed

### Operations
- [ ] On-call process defined for critical bugs
- [ ] Support email or help desk set up for users
- [ ] User onboarding documentation written (beyond this README)
- [ ] Rollback plan documented for failed releases
