// Jest setup file
import '@testing-library/react-native/extend-expect';

// Mock React Native modules that aren't available in Jest
jest.mock('react-native', () => {
  const reactNative = require('react-native/jest/mock');
  return {
    ...reactNative,
    Platform: {
      select: jest.fn((obj) => obj.ios || obj.default),
    },
  };
});

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((cb) => cb(jest.fn())),

    getAllAsync: jest.fn(),
    getFirstRowAsync: jest.fn(),
    execAsync: jest.fn(),
  })),
}));

jest.mock('expo-crypto', () => ({
  getRandomUUID: jest.fn(() => 'test-uuid'),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      currentUser: null,
    },
  })),
}));
