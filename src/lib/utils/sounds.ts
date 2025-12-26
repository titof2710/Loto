'use client';

import { Howl } from 'howler';

// Types de sons disponibles
export type SoundType =
  | 'ball_drawn'
  | 'quine'
  | 'double_quine'
  | 'carton_plein'
  | 'one_remaining'
  | 'error'
  | 'success';

// Cache des sons chargés
const soundCache: Map<SoundType, Howl> = new Map();

// Configuration des sons (utilisant des sons générés en base64 ou URLs)
const soundConfig: Record<SoundType, { src: string[]; volume: number }> = {
  ball_drawn: {
    src: ['/sounds/ball.mp3', '/sounds/ball.ogg'],
    volume: 0.5,
  },
  quine: {
    src: ['/sounds/quine.mp3', '/sounds/quine.ogg'],
    volume: 0.8,
  },
  double_quine: {
    src: ['/sounds/double-quine.mp3', '/sounds/double-quine.ogg'],
    volume: 0.9,
  },
  carton_plein: {
    src: ['/sounds/carton-plein.mp3', '/sounds/carton-plein.ogg'],
    volume: 1.0,
  },
  one_remaining: {
    src: ['/sounds/alert.mp3', '/sounds/alert.ogg'],
    volume: 0.7,
  },
  error: {
    src: ['/sounds/error.mp3', '/sounds/error.ogg'],
    volume: 0.5,
  },
  success: {
    src: ['/sounds/success.mp3', '/sounds/success.ogg'],
    volume: 0.6,
  },
};

// Sons de secours en base64 (bips simples générés)
const fallbackSounds: Record<SoundType, string> = {
  ball_drawn: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  quine: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  double_quine: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  carton_plein: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  one_remaining: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+ZkIF0aWVteIOQmJmUjYF2bmtwd4GJj4+LhX53c3N3fYOIiomGgn57eXt+goWHh4WCf3x7fH6AgoSFhIOBf35+f4GCg4OEg4KAf4B/gIGCg4KDgoGAgIB/gIGBgoKCgoGBgICAgICBgYGBgYGBgYGAgICAgICAgYGBgQ==',
};

/**
 * Obtient ou crée une instance Howl pour un type de son
 */
function getSound(type: SoundType): Howl {
  if (soundCache.has(type)) {
    return soundCache.get(type)!;
  }

  const config = soundConfig[type];
  const sound = new Howl({
    src: config.src,
    volume: config.volume,
    preload: true,
    onloaderror: () => {
      // Utiliser le son de secours en base64
      const fallback = new Howl({
        src: [fallbackSounds[type]],
        volume: config.volume,
      });
      soundCache.set(type, fallback);
    },
  });

  soundCache.set(type, sound);
  return sound;
}

/**
 * Joue un son
 */
export function playSound(type: SoundType, enabled: boolean = true): void {
  if (!enabled) return;

  try {
    const sound = getSound(type);
    sound.play();
  } catch (error) {
    console.warn(`Could not play sound: ${type}`, error);
  }
}

/**
 * Précharge tous les sons
 */
export function preloadSounds(): void {
  Object.keys(soundConfig).forEach((type) => {
    getSound(type as SoundType);
  });
}

/**
 * Arrête tous les sons
 */
export function stopAllSounds(): void {
  soundCache.forEach((sound) => {
    sound.stop();
  });
}

/**
 * Joue le son approprié pour un type de gain
 */
export function playWinSound(winType: 'quine' | 'double_quine' | 'carton_plein', enabled: boolean = true): void {
  playSound(winType, enabled);
}
