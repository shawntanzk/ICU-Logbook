import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase } from './src/database/client';
import { useOfflineStore } from './src/store/offlineStore';
import { useTermsStore } from './src/store/termsStore';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useConsentStore } from './src/store/consentStore';
import { useAuthStore } from './src/store/authStore';
import { useGuestStore } from './src/store/guestStore';
import { initNetworkTracking } from './src/store/networkStore';
import { initErrorReporting } from './src/services/errorReporting';
import { COLORS, FONT_SIZE } from './src/utils/constants';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://88362d6c0f2df3e338eee433da22c044@o4511285439299584.ingest.de.sentry.io/4511285443887184',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

type AppState = 'loading' | 'ready' | 'error';

export default Sentry.wrap(function App() {
  const [state, setState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Sentry first so we capture any later init failures.
    initErrorReporting();
    const unsubscribeNet = initNetworkTracking();

    initializeDatabase()
      .then(() => Promise.all([
        useConsentStore.getState().hydrate(),
        useOfflineStore.getState().hydrate(),
        useTermsStore.getState().hydrate(),
        useAuthStore.getState().restore(),
      ]))
      .then(() => {
        // Hydrate guest mode only when not already signed in via Supabase.
        // A live Supabase session always takes priority over guest mode.
        const { isLoggedIn } = useAuthStore.getState();
        if (!isLoggedIn) return useGuestStore.getState().hydrate();
      })
      .then(() => setState('ready'))
      .catch((err: unknown) => {
        console.error('DB init failed:', err);
        setErrorMessage(String(err));
        setState('error');
      });

    return () => {
      unsubscribeNet();
    };
  }, []);

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initialising…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Failed to start</Text>
        <Text style={styles.errorDetail}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 24 },
  loadingText: { marginTop: 12, fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  errorTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.error, marginBottom: 8 },
  errorDetail: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
});
