// Mock Supabase client — swap for real client when backend is ready.
//
// To switch to real Supabase:
//   1. npm install @supabase/supabase-js
//   2. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
//   3. Replace this file with:
//        import { createClient } from '@supabase/supabase-js';
//        export const supabase = createClient(
//          process.env.EXPO_PUBLIC_SUPABASE_URL!,
//          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
//        );

const SIMULATED_LATENCY_MS = 900;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

interface MockResult {
  data: unknown[] | null;
  error: null | { message: string };
}

function makeTable(tableName: string) {
  return {
    async upsert(rows: unknown[]): Promise<MockResult> {
      await delay(SIMULATED_LATENCY_MS);
      console.log(`[Supabase Mock] upsert → ${tableName} (${rows.length} rows)`);
      // Simulate occasional network error (10% chance) for realistic testing
      if (Math.random() < 0.1) {
        return { data: null, error: { message: 'Simulated network error' } };
      }
      return { data: rows as unknown[], error: null };
    },
    async select(): Promise<MockResult> {
      await delay(SIMULATED_LATENCY_MS / 2);
      return { data: [], error: null };
    },
  };
}

export const supabaseMock = {
  from: (tableName: string) => makeTable(tableName),
};
