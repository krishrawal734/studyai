import { useSyncExternalStore } from 'react';
import { useSettingsStore } from '../store';

let fallbackHydrated = false;

if (typeof setTimeout !== 'undefined') {
  setTimeout(() => {
    fallbackHydrated = true;
  }, 500);
}

/**
 * Hook to safely read Zustand AsyncStorage hydration status without cascading renders.
 * Automatically resolves within 500ms even if AsyncStorage takes longer or encounters an issue,
 * preventing any frozen blank screen on application launch.
 */
export function useHydration(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const unsub = useSettingsStore.persist.onFinishHydration(callback);
      const timer = setTimeout(callback, 500);
      return () => {
        unsub();
        clearTimeout(timer);
      };
    },
    () => {
      try {
        return useSettingsStore.persist.hasHydrated() || fallbackHydrated;
      } catch {
        return true;
      }
    },
    () => true
  );
}
