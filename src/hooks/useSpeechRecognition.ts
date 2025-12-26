'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { parseSpokenNumbers } from '@/lib/speech/frenchNumbers';

interface SpeechRecognitionHook {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  lastNumbers: number[];
  error: string | null;
  start: () => void;
  stop: () => void;
}

// Types pour l'API Web Speech
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
}

export function useSpeechRecognition(
  onNumberDetected?: (num: number) => void
): SpeechRecognitionHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastNumbers, setLastNumbers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const detectedNumbersRef = useRef<Set<number>>(new Set());

  // Vérifier le support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(supported);
  }, []);

  // Initialiser la reconnaissance
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      // Parser les numéros
      const numbers = parseSpokenNumbers(currentTranscript);
      setLastNumbers(numbers);

      // Notifier les nouveaux numéros
      if (finalTranscript && onNumberDetected) {
        for (const num of numbers) {
          if (!detectedNumbersRef.current.has(num)) {
            detectedNumbersRef.current.add(num);
            onNumberDetected(num);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setError('Accès au microphone refusé');
      } else if (event.error === 'no-speech') {
        // Pas d'erreur visible, juste redémarrer
      } else {
        setError(`Erreur: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);

      // Redémarrer automatiquement si on veut continuer
      if (recognitionRef.current === recognition) {
        // Le composant veut toujours écouter
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isSupported, onNumberDetected]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      detectedNumbersRef.current.clear();
      setTranscript('');
      setLastNumbers([]);
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Impossible de démarrer la reconnaissance vocale');
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    lastNumbers,
    error,
    start,
    stop,
  };
}
