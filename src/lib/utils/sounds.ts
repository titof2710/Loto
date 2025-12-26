'use client';

// Types de sons disponibles
export type SoundType =
  | 'ball_drawn'
  | 'quine'
  | 'double_quine'
  | 'carton_plein'
  | 'one_remaining'
  | 'error'
  | 'success';

// Cache AudioContext et buffers
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Générateur de sons synthétiques
function playTone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

// Sons de victoire (séquences de notes)
function playWinSequence(notes: Array<{ freq: number; dur: number }>, volume: number): void {
  try {
    const ctx = getAudioContext();
    let time = ctx.currentTime;

    for (const note of notes) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(note.freq, time);

      gainNode.gain.setValueAtTime(volume, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.dur * 0.9);

      oscillator.start(time);
      oscillator.stop(time + note.dur);

      time += note.dur;
    }
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

// Configuration des sons
const soundEffects: Record<SoundType, () => void> = {
  ball_drawn: () => playTone(800, 0.1, 0.3, 'sine'),

  quine: () => playWinSequence([
    { freq: 523, dur: 0.15 },  // C5
    { freq: 659, dur: 0.15 },  // E5
    { freq: 784, dur: 0.3 },   // G5
  ], 0.5),

  double_quine: () => playWinSequence([
    { freq: 523, dur: 0.12 },  // C5
    { freq: 659, dur: 0.12 },  // E5
    { freq: 784, dur: 0.12 },  // G5
    { freq: 1047, dur: 0.4 },  // C6
  ], 0.6),

  carton_plein: () => playWinSequence([
    { freq: 523, dur: 0.1 },   // C5
    { freq: 659, dur: 0.1 },   // E5
    { freq: 784, dur: 0.1 },   // G5
    { freq: 1047, dur: 0.15 }, // C6
    { freq: 784, dur: 0.1 },   // G5
    { freq: 1047, dur: 0.15 }, // C6
    { freq: 1319, dur: 0.4 },  // E6
  ], 0.7),

  one_remaining: () => playWinSequence([
    { freq: 880, dur: 0.15 },  // A5
    { freq: 880, dur: 0.15 },  // A5
    { freq: 880, dur: 0.15 },  // A5
  ], 0.5),

  error: () => playTone(200, 0.3, 0.4, 'sawtooth'),

  success: () => playWinSequence([
    { freq: 660, dur: 0.1 },
    { freq: 880, dur: 0.2 },
  ], 0.4),
};

/**
 * Joue un son
 */
export function playSound(type: SoundType, enabled: boolean = true): void {
  if (!enabled) return;

  try {
    const effect = soundEffects[type];
    if (effect) {
      effect();
    }
  } catch (error) {
    console.warn(`Could not play sound: ${type}`, error);
  }
}

/**
 * Précharge les sons (initialise l'AudioContext)
 */
export function preloadSounds(): void {
  // L'AudioContext sera initialisé au premier son joué
  // On ne peut pas le créer sans interaction utilisateur
}

/**
 * Arrête tous les sons
 */
export function stopAllSounds(): void {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

/**
 * Joue le son approprié pour un type de gain
 */
export function playWinSound(winType: 'quine' | 'double_quine' | 'carton_plein', enabled: boolean = true): void {
  playSound(winType, enabled);
}
