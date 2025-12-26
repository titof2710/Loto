'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadPlanches = useGameStore((state) => state.loadPlanches);
  const colorBlindMode = useSettingsStore((state) => state.colorBlindMode);

  useEffect(() => {
    loadPlanches();
  }, [loadPlanches]);

  // Appliquer le mode daltonien sur le body
  useEffect(() => {
    const body = document.body;
    // Retirer toutes les classes de daltonisme
    body.classList.remove('colorblind-deuteranopia', 'colorblind-protanopia', 'colorblind-tritanopia');

    // Ajouter la classe appropriée
    if (colorBlindMode !== 'none') {
      body.classList.add(`colorblind-${colorBlindMode}`);
    }
  }, [colorBlindMode]);

  return <>{children}</>;
}
