'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { playSound, playWinSound, preloadSounds } from '@/lib/utils/sounds';
import { vibrate, vibrateForWin, vibrateAlert, vibrationPatterns } from '@/lib/utils/vibration';
import type { WinType, CartonProgress } from '@/types';

interface UseAlertsResult {
  alertWin: (winType: WinType) => void;
  alertOneRemaining: () => void;
  alertBallDrawn: () => void;
  checkAndAlertProgress: (progress: CartonProgress[]) => void;
}

export function useAlerts(): UseAlertsResult {
  const { soundEnabled, vibrationEnabled, alertsEnabled } = useSettingsStore();
  const lastAlertedRef = useRef<Set<string>>(new Set());

  // Précharger les sons au montage
  useEffect(() => {
    if (soundEnabled) {
      preloadSounds();
    }
  }, [soundEnabled]);

  const alertWin = useCallback(
    (winType: WinType) => {
      playWinSound(winType, soundEnabled);
      vibrateForWin(winType, vibrationEnabled);
    },
    [soundEnabled, vibrationEnabled]
  );

  const alertOneRemaining = useCallback(() => {
    if (!alertsEnabled) return;
    playSound('one_remaining', soundEnabled);
    vibrateAlert(vibrationEnabled);
  }, [soundEnabled, vibrationEnabled, alertsEnabled]);

  const alertBallDrawn = useCallback(() => {
    playSound('ball_drawn', soundEnabled);
    vibrate(vibrationPatterns.short, vibrationEnabled);
  }, [soundEnabled, vibrationEnabled]);

  const checkAndAlertProgress = useCallback(
    (progress: CartonProgress[]) => {
      if (!alertsEnabled) return;

      for (const p of progress) {
        // Alerte "plus qu'un pour la quine"
        if (p.missingForQuine.length === 1) {
          const key = `quine-${p.cartonId}-${p.missingForQuine[0]}`;
          if (!lastAlertedRef.current.has(key)) {
            lastAlertedRef.current.add(key);
            alertOneRemaining();
          }
        }

        // Alerte "plus qu'un pour le carton plein"
        if (p.missingForCartonPlein.length === 1) {
          const key = `plein-${p.cartonId}-${p.missingForCartonPlein[0]}`;
          if (!lastAlertedRef.current.has(key)) {
            lastAlertedRef.current.add(key);
            alertOneRemaining();
          }
        }
      }
    },
    [alertsEnabled, alertOneRemaining]
  );

  return {
    alertWin,
    alertOneRemaining,
    alertBallDrawn,
    checkAndAlertProgress,
  };
}
