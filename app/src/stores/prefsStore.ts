import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FocusBadgeKey } from '@/api/types';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PrefsState {
  theme: ThemePreference;
  notifyDeadlines: boolean;
  notifyReview: boolean;
  /** Start the next focus cycle on its own when a break ends. */
  autoChainCycles: boolean;
  /** Badges already shown to the user (null = not loaded yet: the first load sets them silently). */
  seenBadges: FocusBadgeKey[] | null;
  /** Last day (ISO) the "daily goal reached" celebration was shown. */
  celebratedGoalDay: string | null;
  setTheme: (theme: ThemePreference) => void;
  setNotifyDeadlines: (enabled: boolean) => void;
  setNotifyReview: (enabled: boolean) => void;
  setAutoChainCycles: (enabled: boolean) => void;
  setSeenBadges: (badges: FocusBadgeKey[]) => void;
  setCelebratedGoalDay: (day: string) => void;
  /** Celebrations belong to an account: forget them at logout. */
  resetCelebrations: () => void;
}

/** Per-device preferences (theme, reminders, focus), persisted with AsyncStorage (localStorage on the web). */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      notifyDeadlines: false,
      notifyReview: false,
      autoChainCycles: false,
      seenBadges: null,
      celebratedGoalDay: null,
      setTheme: (theme) => set({ theme }),
      setNotifyDeadlines: (notifyDeadlines) => set({ notifyDeadlines }),
      setNotifyReview: (notifyReview) => set({ notifyReview }),
      setAutoChainCycles: (autoChainCycles) => set({ autoChainCycles }),
      setSeenBadges: (seenBadges) => set({ seenBadges }),
      setCelebratedGoalDay: (celebratedGoalDay) => set({ celebratedGoalDay }),
      resetCelebrations: () => set({ seenBadges: null, celebratedGoalDay: null }),
    }),
    {
      name: 'mymarathon.prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, notifyDeadlines, notifyReview, autoChainCycles, seenBadges, celebratedGoalDay }) => ({
        theme,
        notifyDeadlines,
        notifyReview,
        autoChainCycles,
        seenBadges,
        celebratedGoalDay,
      }),
    },
  ),
);
