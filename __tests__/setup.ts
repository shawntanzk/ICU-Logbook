// Jest setup file — loaded as a setupFilesAfterEnv entry.
// @testing-library/jest-native matchers (toBeVisible, toHaveText, etc.)
import '@testing-library/react-native/extend-expect';

// expo-sqlite: minimal stub so service tests can import without a native DB.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      getAllAsync: jest.fn(() => Promise.resolve([])),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      runAsync: jest.fn(() => Promise.resolve()),
      execAsync: jest.fn(() => Promise.resolve()),
      withTransactionAsync: jest.fn((cb: () => Promise<void>) => cb()),
    })
  ),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
  getRandomValues: jest.fn((arr: Uint8Array) => arr),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      order: jest.fn().mockReturnThis(),
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: {
      invoke: jest.fn(),
    },
  })),
}));
