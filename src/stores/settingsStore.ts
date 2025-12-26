import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

interface SettingsStore extends Settings {
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // État initial
      soundEnabled: true,
      vibrationEnabled: true,
      alertsEnabled: true,
      theme: 'system',

      // Actions
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'loto-settings',
    }
  )
);
