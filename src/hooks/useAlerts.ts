'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { playSound, playWinSound, preloadSounds } from '@/lib/utils/sounds';
import { vibrate, vibrateForWin, vibrateAlert, vibrationPatterns } from '@/lib/utils/vibration';
import type { WinType, CartonProgress, PrizeType } from '@/types';

interface UseAlertsResult {
  alertWin: (winType: WinType) => void;
  alertOneRemaining: () => void;
  alertBallDrawn: () => void;
  checkAndAlertProgress: (progress: CartonProgress[], currentPrizeType?: PrizeType) => void;
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
    (progress: CartonProgress[], currentPrizeType?: PrizeType) => {
      if (!alertsEnabled) return;

      for (const p of progress) {
        // Alerte "plus qu'un pour la quine" - seulement si on joue pour la Quine
        if (currentPrizeType === 'Q' && p.missingForQuine.length === 1) {
          const key = `quine-${p.cartonId}-${p.missingForQuine[0]}`;
          if (!lastAlertedRef.current.has(key)) {
            lastAlertedRef.current.add(key);
            alertOneRemaining();
          }
        }

        // Alerte "plus qu'un pour la double quine" - seulement si on joue pour la DQ
        if (currentPrizeType === 'DQ' && p.missingForDoubleQuine.length === 1) {
          const key = `dq-${p.cartonId}-${p.missingForDoubleQuine[0]}`;
          if (!lastAlertedRef.current.has(key)) {
            lastAlertedRef.current.add(key);
            alertOneRemaining();
          }
        }

        // Alerte "plus qu'un pour le carton plein" - seulement si on joue pour le CP
        if (currentPrizeType === 'CP' && p.missingForCartonPlein.length === 1) {
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
