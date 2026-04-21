import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Wraps NetInfo as a Zustand store so any screen can render the
// current online state without subscribing to NetInfo directly.
// A single top-level subscription is set up in App.tsx via
// `initNetworkTracking()`.

interface NetworkStore {
  isOnline: boolean;
  // `null` until the first NetInfo event arrives — lets callers avoid
  // treating "loading" as "offline".
  hydrated: boolean;
  _apply: (state: NetInfoState) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  isOnline: true,
  hydrated: false,
  _apply: (state) => {
    // "reachable" is more conservative than "connected" — a wifi
    // network with no internet still reports connected=true. When
    // reachable is null we fall back to `isConnected`.
    const reachable = state.isInternetReachable ?? state.isConnected ?? false;
    set({ isOnline: !!reachable, hydrated: true });
  },
}));

let unsubscribe: (() => void) | null = null;

export function initNetworkTracking(): () => void {
  if (unsubscribe) return unsubscribe;
  unsubscribe = NetInfo.addEventListener((state) => {
    useNetworkStore.getState()._apply(state);
  });
  // Also fetch once so we don't wait for the first change event.
  NetInfo.fetch().then((state) => useNetworkStore.getState()._apply(state));
  return unsubscribe;
}
