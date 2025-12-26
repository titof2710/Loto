import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface SettingsStore extends Settings {
  colorBlindMode: ColorBlindMode;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // État initial
      soundEnabled: true,
      vibrationEnabled: true,
      alertsEnabled: true,
      theme: 'system',
      colorBlindMode: 'none',

      // Actions
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setAlertsEnabled: (enabled) => set({ alertsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setColorBlindMode: (mode) => set({ colorBlindMode: mode }),
    }),
    {
      name: 'loto-settings',
    }
  )
);
