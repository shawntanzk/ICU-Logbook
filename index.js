// WebCrypto polyfill must run before any module that imports Supabase.
// Provides crypto.subtle.digest via expo-crypto so Supabase uses s256 PKCE
// rather than falling back to plain mode.
import './src/polyfills/crypto';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent sets up the correct entry for both Expo Go and a
// native/bare build, replacing the older `expo/AppEntry` path that SDK 52
// dropped.
registerRootComponent(App);
