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

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio + emulator

---

## Project Structure

```
/
├── App.tsx                   Root component — DB init + navigation
├── src/
│   ├── models/               TypeScript types + Zod schemas
│   │   ├── CaseLog.ts
│   │   └── ProcedureLog.ts
│   ├── database/
│   │   ├── client.ts         SQLite singleton + WAL mode
│   │   └── migrations.ts     Versioned schema migrations
│   ├── services/
│   │   ├── DataService.ts    IDataService + ISyncService interfaces
│   │   ├── CaseService.ts    CRUD + derived queries for cases
│   │   ├── ProcedureService.ts
│   │   └── SyncService.ts    Stub — replace with backend client
│   ├── store/
│   │   ├── caseStore.ts      Zustand store (cases + stats)
│   │   └── procedureStore.ts Zustand store (procedures + stats)
│   ├── components/           Reusable UI primitives
│   ├── screens/              One file per screen
│   ├── navigation/           React Navigation setup + types
│   └── utils/
│       ├── constants.ts      Colors, spacing, clinical data lists
│       ├── dateUtils.ts      dayjs helpers
│       └── uuid.ts           UUID v4 generator
```

---

## Adding a Supabase Backend

The app is structured so that sync can be added without touching screens or stores.

### Step 1 — Install Supabase client

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

### Step 2 — Replace SyncService stub

Open `src/services/SyncService.ts` and implement `syncPending()`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { getDatabase } from '../database/client';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async syncPending(): Promise<SyncResult> {
  const db = await getDatabase();
  const unsynced = await db.getAllAsync(
    'SELECT * FROM case_logs WHERE synced = 0'
  );
  // upsert to Supabase, then mark synced = 1
  const { error } = await supabase.from('case_logs').upsert(unsynced);
  if (!error) {
    for (const row of unsynced) {
      await db.runAsync('UPDATE case_logs SET synced = 1 WHERE id = ?', [row.id]);
    }
  }
  return { synced: error ? 0 : unsynced.length, failed: error ? unsynced.length : 0, pending: 0 };
}
```

### Step 3 — Add environment variables

Create `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Adding Authentication

Authentication is intentionally not included in the MVP. To add it:

1. Implement Supabase Auth (email/password or SSO)
2. Create `src/services/AuthService.ts` with `signIn`, `signOut`, `getSession`
3. Add an `AuthStack` to `RootNavigator.tsx` that conditionally shows
   `LoginScreen` vs `TabNavigator` based on session state
4. No changes to business logic, stores, or database required

---

## Adding a Supervisor Role

1. Add a `role` field to the user profile table in Supabase
2. Create `src/store/authStore.ts` with role-aware selectors
3. In screens, check `authStore.role === 'supervisor'` to show/hide
   supervisor-only actions (e.g. sign off on cases)
4. Add a `supervisorId` column to `case_logs` for case attribution

---

## Adding AI Summaries

The reflection field and case data feed directly into an AI summary feature:

1. Create `src/services/AIService.ts`
2. Call Claude API with the case data as context
3. Display the summary in `CaseDetailScreen.tsx`

Endpoint suggestion:
```
POST /api/summarise-case
Body: { caseLog: CaseLog, recentCases: CaseLog[] }
```

---

## Database Migrations

To add a column or table in future releases:

1. Open `src/database/migrations.ts`
2. Append a new entry to the `MIGRATIONS` array with the next version number
3. Never edit existing migration entries

The migration runner skips already-applied versions, so upgrades are safe.

---

## Sync Architecture Notes

- Every record has `synced: boolean` (stored as INTEGER 0/1 in SQLite)
- `created_at` / `updated_at` are ISO strings for conflict resolution
- On sync, use `updated_at` as the server-side "last writer wins" signal
- For stronger consistency, add a `server_updated_at` column later

---

## Known Limitations (MVP)

- No date picker — users type YYYY-MM-DD manually
- No edit screen for existing cases (delete and re-log)
- No data export implemented
- Sync is a stub
- No authentication

All of these are intentional scope decisions for the pilot phase.
