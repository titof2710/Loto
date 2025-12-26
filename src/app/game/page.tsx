'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, RotateCcw, Mic, MicOff, Plus, Volume2, Gift, Zap, Pause, Youtube, X, Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useTirageStore } from '@/stores/tirageStore';
import { NumberPad } from '@/components/game/NumberPad';
import { DrawnBalls } from '@/components/game/DrawnBalls';
import { PlancheView } from '@/components/game/PlancheView';
import { WinAlert } from '@/components/game/WinAlert';
import { CurrentPrize, PrizeWonButton } from '@/components/game/CurrentPrize';
import { TirageSelector, useTirageSelector } from '@/components/game/TirageSelector';
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
    clearDrawnBalls,
    drawBall,
    undoLastBall,
    toggleVoiceRecognition,
    getAllCartonsProgress,
  } = useGameStore();

  // Store tirage pour les cadeaux
  const {
    allTirages,
    currentTirage,
    isLoading: tirageLoading,
    isPrizesLoading,
    loadTirages,
    selectTirage,
    advanceToNextType,
    nextGroup,
    getCurrentPrize,
    isLastTypeInGroup,
  } = useTirageStore();

  // Hook pour le sélecteur de tirage
  const tirageSelector = useTirageSelector();

  const [activeWin, setActiveWin] = useState<typeof wins[0] | null>(null);
  const [viewMode, setViewMode] = useState<'keyboard' | 'cartons'>('keyboard');
  const [lastVoiceNumber, setLastVoiceNumber] = useState<number | null>(null);
  const lastWinsCountRef = useRef(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<'slow' | 'fast'>('slow');
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const [showYoutube, setShowYoutube] = useState(true); // Affiché par défaut
  const [youtubeMinimized, setYoutubeMinimized] = useState(false);

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

  // Charger les tirages au montage
  useEffect(() => {
    loadTirages();
  }, [loadTirages]);

  // Gérer l'activation/désactivation de la reconnaissance vocale
  useEffect(() => {
    if (voiceRecognitionEnabled && isPlaying && voiceSupported) {
      startVoice();
    } else {
      stopVoice();
    }
  }, [voiceRecognitionEnabled, isPlaying, voiceSupported, startVoice, stopVoice]);

  // Afficher les nouveaux gains (seulement si c'est un NOUVEAU gain)
  // Et avancer automatiquement au cadeau suivant
  useEffect(() => {
    if (wins.length > lastWinsCountRef.current) {
      // Il y a un nouveau gain
      const lastWin = wins[wins.length - 1];
      setActiveWin(lastWin);
      alertWin(lastWin.type);

      // Avancer automatiquement au type suivant (Q→DQ→CP)
      // puisque c'est TON carton qui a gagné
      advanceToNextType();
    }
    // Reset le compteur si wins a été vidé (nouveau cadeau)
    if (wins.length === 0) {
      lastWinsCountRef.current = 0;
    } else {
      lastWinsCountRef.current = wins.length;
    }
  }, [wins, alertWin, advanceToNextType]);

  // Gérer le clic sur "Cadeau gagné" (quand un autre joueur gagne)
  const handlePrizeWon = useCallback(() => {
    if (isLastTypeInGroup()) {
      // On est sur CP, passer au groupe suivant et effacer les boules
      nextGroup();
      clearDrawnBalls();
      lastWinsCountRef.current = 0;
    } else {
      // Passer au type suivant (Q→DQ ou DQ→CP)
      advanceToNextType();
    }
  }, [isLastTypeInGroup, nextGroup, clearDrawnBalls, advanceToNextType]);

  // Vérifier les alertes "plus qu'un"
  const cartonsProgress = getAllCartonsProgress();

  useEffect(() => {
    if (isPlaying) {
      checkAndAlertProgress(cartonsProgress);
    }
  }, [isPlaying, cartonsProgress, checkAndAlertProgress]);

  const drawnNumbers = drawnBalls.map((b) => b.number);

  // Fonction de simulation
  const startSimulation = useCallback(() => {
    if (!isPlaying) {
      startGame();
    }
    setIsSimulating(true);
  }, [isPlaying, startGame]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simulationRef.current) {
      clearTimeout(simulationRef.current);
      simulationRef.current = null;
    }
  }, []);

  // Effet de simulation
  useEffect(() => {
    if (!isSimulating || !isPlaying) {
      if (simulationRef.current) {
        clearTimeout(simulationRef.current);
        simulationRef.current = null;
      }
      return;
    }

    // Trouver les numéros non tirés
    const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
      .filter(n => !drawnNumbers.includes(n));

    if (availableNumbers.length === 0) {
      setIsSimulating(false);
      return;
    }

    // Tirer un numéro aléatoire
    const delay = simulationSpeed === 'slow' ? 1500 : 300;
    simulationRef.current = setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const randomNumber = availableNumbers[randomIndex];
      drawBall(randomNumber, 'manual');
      alertBallDrawn();
    }, delay);

    return () => {
      if (simulationRef.current) {
        clearTimeout(simulationRef.current);
      }
    };
  }, [isSimulating, isPlaying, drawnNumbers, simulationSpeed, drawBall, alertBallDrawn]);

  // Nettoyer la simulation quand le jeu est arrêté
  useEffect(() => {
    if (!isPlaying && isSimulating) {
      setIsSimulating(false);
    }
  }, [isPlaying, isSimulating]);

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

  // Cadeau actuel
  const currentPrize = getCurrentPrize();

  return (
    <div className="p-4 space-y-4">
      {/* Alerte de gain */}
      {activeWin && (
        <WinAlert win={activeWin} onDismiss={() => setActiveWin(null)} />
      )}

      {/* Modal sélection tirage */}
      {tirageSelector.isOpen && (
        <TirageSelector
          tirages={allTirages}
          currentTirageId={currentTirage?.id}
          isLoading={tirageLoading}
          onSelect={selectTirage}
          onRefresh={loadTirages}
          onClose={tirageSelector.close}
        />
      )}

      {/* Cadeau actuel */}
      <CurrentPrize
        prize={currentPrize}
        tirageName={currentTirage?.title}
        isLoading={isPrizesLoading}
        onChangeTirage={tirageSelector.open}
      />

      {/* Contrôles de partie */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            onClick={startGame}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            <Play className="w-5 h-5" />
            {drawnBalls.length > 0 ? 'Reprendre' : 'Démarrer la partie'}
          </button>
        ) : (
          <>
            <button
              onClick={stopGame}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-500 text-white rounded-lg font-medium"
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

        {/* Bouton simulation */}
        <button
          onClick={isSimulating ? stopSimulation : startSimulation}
          className={cn(
            'p-3 rounded-lg transition-colors relative',
            isSimulating
              ? 'bg-amber-500 text-white'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          )}
          title={isSimulating ? 'Arrêter la simulation' : 'Simulation aléatoire'}
        >
          {isSimulating ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          {isSimulating && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 rounded-full animate-pulse" />
          )}
        </button>

        {/* Bouton YouTube */}
        <button
          onClick={() => setShowYoutube(!showYoutube)}
          className={cn(
            'p-3 rounded-lg transition-colors',
            showYoutube
              ? 'bg-red-500 text-white'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
          )}
          title="Stream YouTube"
        >
          <Youtube className="w-5 h-5" />
        </button>
      </div>

      {/* Bouton "Cadeau gagné" - bien visible pendant le jeu */}
      {isPlaying && currentPrize && (
        <PrizeWonButton
          onClick={handlePrizeWon}
          isLastInGroup={isLastTypeInGroup()}
          disabled={!isPlaying}
        />
      )}

      {/* Contrôle vitesse simulation */}
      {isSimulating && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">Simulation en cours</span>
          <div className="flex-1" />
          <button
            onClick={() => setSimulationSpeed(simulationSpeed === 'slow' ? 'fast' : 'slow')}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium',
              simulationSpeed === 'fast'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-500/20 text-amber-600'
            )}
          >
            {simulationSpeed === 'slow' ? 'Lent' : 'Rapide'}
          </button>
        </div>
      )}

      {/* Lecteur YouTube - Live Loto Fiesta */}
      {showYoutube && (
        <div className={cn(
          'bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden',
          youtubeMinimized ? 'fixed bottom-24 right-4 w-48 z-40 shadow-lg' : ''
        )}>
          <div className="flex items-center justify-between p-2 bg-red-500 text-white">
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              <span className="text-sm font-medium">
                {youtubeMinimized ? 'Live' : 'Loto Fiesta Live'}
              </span>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYoutubeMinimized(!youtubeMinimized)}
                className="p-1 hover:bg-white/20 rounded"
                title={youtubeMinimized ? 'Agrandir' : 'Réduire'}
              >
                {youtubeMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setShowYoutube(false)}
                className="p-1 hover:bg-white/20 rounded"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={cn(
            'relative bg-black',
            youtubeMinimized ? 'aspect-video' : 'aspect-video'
          )}>
            {/* Embed direct du live via l'URL de la chaîne */}
            <iframe
              src="https://www.youtube.com/embed/live_stream?channel=UC3D1VPrTAnlt1tik9KcC4nQ&autoplay=1"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {!youtubeMinimized && (
            <div className="p-2 bg-[var(--muted)] flex items-center justify-center gap-2">
              <a
                href="https://www.youtube.com/@LotoFiesta/live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Ouvrir dans YouTube
              </a>
            </div>
          )}
        </div>
      )}

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
