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
import { initNetworkTracking } from './src/store/networkStore';
import { initErrorReporting } from './src/services/errorReporting';
import { COLORS, FONT_SIZE } from './src/utils/constants';

type AppState = 'loading' | 'ready' | 'error';

export default function App() {
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
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 24 },
  loadingText: { marginTop: 12, fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  errorTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.error, marginBottom: 8 },
  errorDetail: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' },
});
