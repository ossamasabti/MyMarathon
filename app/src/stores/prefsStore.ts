import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PrefsState {
  theme: ThemePreference;
  notifyDeadlines: boolean;
  notifyReview: boolean;
  setTheme: (theme: ThemePreference) => void;
  setNotifyDeadlines: (enabled: boolean) => void;
  setNotifyReview: (enabled: boolean) => void;
}

/** Per-device preferences (theme, reminders), persisted with AsyncStorage (localStorage on the web). */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      notifyDeadlines: false,
      notifyReview: false,
      setTheme: (theme) => set({ theme }),
      setNotifyDeadlines: (notifyDeadlines) => set({ notifyDeadlines }),
      setNotifyReview: (notifyReview) => set({ notifyReview }),
    }),
    {
      name: 'mymarathon.prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, notifyDeadlines, notifyReview }) => ({ theme, notifyDeadlines, notifyReview }),
    },
  ),
);
