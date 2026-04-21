import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../store/networkStore';
import { useOfflineStore } from '../store/offlineStore';
import { COLORS, FONT_SIZE, SPACING } from '../utils/constants';

// Thin banner that surfaces connectivity state. Renders nothing when
// online and in normal mode; a muted strip when the user has chosen
// offline-only; an amber strip when the device has lost connectivity
// involuntarily. Sync errors stay noisy (alerts) — this is just
// ambient status.
export function NetworkBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline, hydrated } = useNetworkStore();
  const offlineOnly = useOfflineStore((s) => s.offlineOnly);

  if (!hydrated) return null;
  if (isOnline && !offlineOnly) return null;

  const isManual = offlineOnly;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.banner,
        { paddingTop: insets.top + 2 },
        isManual ? styles.manual : styles.involuntary,
      ]}
    >
      <Ionicons
        name={isManual ? 'cloud-offline' : 'cloud-offline-outline'}
        size={14}
        color={COLORS.white}
      />
      <Text style={styles.text}>
        {isManual
          ? 'Offline-only mode — nothing leaves this device.'
          : "You're offline. Changes will sync when you reconnect."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingBottom: 6,
    paddingHorizontal: SPACING.sm,
    zIndex: 1000,
    elevation: 1000,
  },
  manual: { backgroundColor: COLORS.textMuted },
  involuntary: { backgroundColor: COLORS.warning },
  text: { color: COLORS.white, fontSize: FONT_SIZE.xs, fontWeight: '600' },
});
