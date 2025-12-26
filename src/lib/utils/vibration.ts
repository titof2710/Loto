'use client';

/**
 * Patterns de vibration prédéfinis (en millisecondes)
 */
export const vibrationPatterns = {
  // Court - pour les actions simples
  short: [50],

  // Double - pour les alertes
  double: [100, 50, 100],

  // Quine - victoire simple
  quine: [200, 100, 200],

  // Double quine - victoire moyenne
  doubleQuine: [200, 100, 200, 100, 200],

  // Carton plein - grande victoire
  cartonPlein: [300, 100, 300, 100, 300, 100, 300],

  // Alerte - plus qu'un numéro
  alert: [100, 50, 100, 50, 100],

  // Erreur
  error: [500],
};

/**
 * Vérifie si l'API Vibration est supportée
 */
export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Fait vibrer l'appareil avec un pattern
 */
export function vibrate(
  pattern: number | number[],
  enabled: boolean = true
): boolean {
  if (!enabled || !isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    console.warn('Vibration failed:', error);
    return false;
  }
}

/**
 * Arrête la vibration
 */
export function stopVibration(): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(0);
  } catch {
    return false;
  }
}

/**
 * Vibration pour un type de gain
 */
export function vibrateForWin(
  winType: 'quine' | 'double_quine' | 'carton_plein',
  enabled: boolean = true
): boolean {
  const patterns: Record<string, number[]> = {
    quine: vibrationPatterns.quine,
    double_quine: vibrationPatterns.doubleQuine,
    carton_plein: vibrationPatterns.cartonPlein,
  };

  return vibrate(patterns[winType] || vibrationPatterns.short, enabled);
}

/**
 * Vibration d'alerte "plus qu'un"
 */
export function vibrateAlert(enabled: boolean = true): boolean {
  return vibrate(vibrationPatterns.alert, enabled);
}
