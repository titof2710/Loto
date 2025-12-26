'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Square, RotateCcw, Mic, MicOff, Plus, Volume2 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { NumberPad } from '@/components/game/NumberPad';
import { DrawnBalls } from '@/components/game/DrawnBalls';
import { PlancheView } from '@/components/game/PlancheView';
import { WinAlert } from '@/components/game/WinAlert';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAlerts } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

export default function GamePage() {
  const {
    isPlaying,
    planches,
    drawnBalls,
    wins,
    voiceRecognitionEnabled,
    startGame,
    stopGame,
    resetGame,
    drawBall,
    undoLastBall,
    toggleVoiceRecognition,
    getAllCartonsProgress,
  } = useGameStore();

  const [activeWin, setActiveWin] = useState<typeof wins[0] | null>(null);
  const [viewMode, setViewMode] = useState<'keyboard' | 'cartons'>('keyboard');
  const [lastVoiceNumber, setLastVoiceNumber] = useState<number | null>(null);

  // Alertes (sons + vibrations)
  const { alertWin, alertBallDrawn, checkAndAlertProgress } = useAlerts();

  // Callback pour la reconnaissance vocale
  const handleVoiceNumber = useCallback(
    (num: number) => {
      if (isPlaying && voiceRecognitionEnabled) {
        drawBall(num, 'voice');
        setLastVoiceNumber(num);
        alertBallDrawn();

        // Effacer après 2 secondes
        setTimeout(() => setLastVoiceNumber(null), 2000);
      }
    },
    [isPlaying, voiceRecognitionEnabled, drawBall, alertBallDrawn]
  );

  // Reconnaissance vocale
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechRecognition(handleVoiceNumber);

  // Gérer l'activation/désactivation de la reconnaissance vocale
  useEffect(() => {
    if (voiceRecognitionEnabled && isPlaying && voiceSupported) {
      startVoice();
    } else {
      stopVoice();
    }
  }, [voiceRecognitionEnabled, isPlaying, voiceSupported, startVoice, stopVoice]);

  // Afficher les nouveaux gains
  useEffect(() => {
    if (wins.length > 0) {
      const lastWin = wins[wins.length - 1];
      setActiveWin(lastWin);
      alertWin(lastWin.type);
    }
  }, [wins, alertWin]);

  // Vérifier les alertes "plus qu'un"
  const cartonsProgress = getAllCartonsProgress();

  useEffect(() => {
    if (isPlaying) {
      checkAndAlertProgress(cartonsProgress);
    }
  }, [isPlaying, cartonsProgress, checkAndAlertProgress]);

  const drawnNumbers = drawnBalls.map((b) => b.number);

  // Pas de planches
  if (planches.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
          <Plus className="w-10 h-10 text-[var(--muted-foreground)]" />
        </div>
        <h2 className="text-xl font-bold mb-2">Aucune planche</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          Scannez ou ajoutez des cartons pour commencer une partie
        </p>
        <Link
          href="/scan"
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium"
        >
          Scanner une planche
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Alerte de gain */}
      {activeWin && (
        <WinAlert win={activeWin} onDismiss={() => setActiveWin(null)} />
      )}

      {/* Contrôles de partie */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={startGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            <Play className="w-5 h-5" />
            Démarrer la partie
          </button>
        ) : (
          <>
            <button
              onClick={stopGame}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-lg font-medium"
            >
              <Square className="w-5 h-5" />
              Pause
            </button>
            <button
              onClick={resetGame}
              className="p-3 bg-[var(--destructive)] text-white rounded-lg"
              title="Réinitialiser"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bouton reconnaissance vocale */}
        {voiceSupported && (
          <button
            onClick={toggleVoiceRecognition}
            disabled={!isPlaying}
            className={cn(
              'p-3 rounded-lg transition-colors relative',
              voiceRecognitionEnabled
                ? 'bg-purple-500 text-white'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]',
              !isPlaying && 'opacity-50 cursor-not-allowed'
            )}
            title={voiceRecognitionEnabled ? 'Désactiver la voix' : 'Activer la voix'}
          >
            {voiceRecognitionEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            {isListening && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        )}
      </div>

      {/* Indicateur reconnaissance vocale */}
      {voiceRecognitionEnabled && isListening && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Écoute en cours...
            </span>
          </div>
          {transcript && (
            <p className="text-xs text-[var(--muted-foreground)] truncate">
              "{transcript}"
            </p>
          )}
          {lastVoiceNumber && (
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">
              Détecté : {lastVoiceNumber}
            </p>
          )}
          {voiceError && (
            <p className="text-xs text-red-500 mt-1">{voiceError}</p>
          )}
        </div>
      )}

      {/* Boules tirées */}
      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
        <DrawnBalls balls={drawnBalls} />
      </div>

      {/* Toggle view */}
      <div className="flex rounded-lg bg-[var(--muted)] p-1">
        <button
          onClick={() => setViewMode('keyboard')}
          className={cn(
            'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
            viewMode === 'keyboard'
              ? 'bg-[var(--card)] shadow-sm'
              : 'text-[var(--muted-foreground)]'
          )}
        >
          Clavier
        </button>
        <button
          onClick={() => setViewMode('cartons')}
          className={cn(
            'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
            viewMode === 'cartons'
              ? 'bg-[var(--card)] shadow-sm'
              : 'text-[var(--muted-foreground)]'
          )}
        >
          Cartons ({planches.reduce((acc, p) => acc + p.cartons.length, 0)})
        </button>
      </div>

      {/* Contenu principal */}
      {viewMode === 'keyboard' ? (
        <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
          <NumberPad
            drawnNumbers={drawnNumbers}
            onNumberSelect={(num) => {
              drawBall(num, 'manual');
              alertBallDrawn();
            }}
            onUndo={undoLastBall}
            disabled={!isPlaying}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {planches.map((planche) => (
            <div
              key={planche.id}
              className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]"
            >
              <PlancheView
                planche={planche}
                cartonsProgress={cartonsProgress.filter(
                  (p) => p.plancheId === planche.id
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* Alertes "plus qu'un" */}
      {isPlaying && (
        <div className="space-y-2">
          {cartonsProgress
            .filter((p) => p.missingForQuine.length === 1)
            .slice(0, 3) // Limiter à 3 alertes max
            .map((progress) => (
              <div
                key={progress.cartonId}
                className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg animate-pulse-alert"
              >
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  Plus qu'un pour la quine ! Manque le {progress.missingForQuine[0]}
                </span>
              </div>
            ))}
          {cartonsProgress
            .filter((p) => p.missingForCartonPlein.length === 1)
            .slice(0, 3)
            .map((progress) => (
              <div
                key={`plein-${progress.cartonId}`}
                className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg animate-pulse-alert"
              >
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                  Plus qu'un pour le CARTON PLEIN ! Manque le {progress.missingForCartonPlein[0]}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
