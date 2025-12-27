'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Planche, CartonProgress, PrizeType } from '@/types';
import { CartonGrid } from './CartonGrid';
import { Trophy, AlertCircle, Edit2, Check } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

interface PlancheViewProps {
  planche: Planche;
  cartonsProgress: CartonProgress[];
  currentPrizeType?: PrizeType;
}

export function PlancheView({ planche, cartonsProgress, currentPrizeType = 'Q' }: PlancheViewProps) {
  const { updateCartonSerialNumber } = useGameStore();
  const [editingCartonId, setEditingCartonId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fonction pour obtenir le nombre de numéros manquants selon le type
  const getMissingCount = (progress: CartonProgress | undefined): number => {
    if (!progress) return 15;
    switch (currentPrizeType) {
      case 'Q':
        return progress.missingForQuine.length;
      case 'DQ':
        return progress.missingForDoubleQuine.length;
      case 'CP':
        return progress.missingForCartonPlein.length;
      default:
        return progress.missingForQuine.length;
    }
  };

  // Trier les cartons par proximité de l'objectif (moins de numéros manquants = plus proche)
  const sortedCartons = [...planche.cartons].sort((a, b) => {
    const progressA = cartonsProgress.find((p) => p.cartonId === a.id);
    const progressB = cartonsProgress.find((p) => p.cartonId === b.id);
    const missingA = getMissingCount(progressA);
    const missingB = getMissingCount(progressB);
    return missingA - missingB; // Croissant (moins de manquants = premier)
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{planche.name}</h3>
        <span className="text-sm text-[var(--muted-foreground)]">
          {planche.cartons.length} cartons
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sortedCartons.map((carton) => {
          const progress = cartonsProgress.find((p) => p.cartonId === carton.id);
          const completedLines = progress?.linesCompleted.filter(Boolean).length || 0;

          // Calculer si on est proche de gagner selon le type actuel
          const missingForQuine = progress?.missingForQuine.length || 5;
          const missingForDQ = progress?.missingForDoubleQuine.length || 10;
          const missingForCP = progress?.missingForCartonPlein.length || 15;

          const isCloseToWin =
            (currentPrizeType === 'Q' && missingForQuine === 1) ||
            (currentPrizeType === 'DQ' && missingForDQ === 1) ||
            (currentPrizeType === 'CP' && missingForCP === 1);

          return (
            <div
              key={carton.id}
              className={cn(
                'p-2 rounded-lg border',
                completedLines >= 3
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : completedLines >= 2
                  ? 'border-purple-500 bg-purple-500/10'
                  : completedLines >= 1
                  ? 'border-green-500 bg-green-500/10'
                  : isCloseToWin
                  ? 'border-orange-500 bg-orange-500/10 animate-pulse-alert'
                  : 'border-[var(--border)] bg-[var(--card)]'
              )}
            >
              {/* Indicateurs */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    #{carton.position + 1}
                  </span>
                  {editingCartonId === carton.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="XX-XXXX"
                        className="w-20 px-1 py-0.5 text-xs font-mono border rounded bg-[var(--card)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateCartonSerialNumber(planche.id, carton.id, editValue);
                            setEditingCartonId(null);
                          } else if (e.key === 'Escape') {
                            setEditingCartonId(null);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          updateCartonSerialNumber(planche.id, carton.id, editValue);
                          setEditingCartonId(null);
                        }}
                        className="p-0.5 text-green-500 hover:bg-green-500/20 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditValue(carton.serialNumber || '');
                        setEditingCartonId(carton.id);
                      }}
                      className="flex items-center gap-1 hover:bg-[var(--muted)] rounded px-1"
                    >
                      {carton.serialNumber ? (
                        <span className="text-xs font-mono font-bold text-[var(--primary)]">
                          {carton.serialNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)] italic">
                          N° série
                        </span>
                      )}
                      <Edit2 className="w-2.5 h-2.5 text-[var(--muted-foreground)]" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {completedLines >= 1 && (
                    <Trophy className="w-3 h-3 text-green-500" />
                  )}
                  {completedLines >= 2 && (
                    <Trophy className="w-3 h-3 text-purple-500" />
                  )}
                  {completedLines >= 3 && (
                    <Trophy className="w-3 h-3 text-yellow-500" />
                  )}
                  {isCloseToWin && completedLines < 1 && (
                    <AlertCircle className="w-3 h-3 text-orange-500" />
                  )}
                </div>
              </div>

              <CartonGrid carton={carton} progress={progress} compact />

              {/* Progression */}
              {progress && (
                <div className="mt-1 text-xs text-[var(--muted-foreground)] flex items-center justify-between">
                  <span>{progress.markedNumbers.length}/15</span>
                  {isCloseToWin ? (
                    <span className="text-orange-500 font-bold animate-pulse">
                      1 pour {currentPrizeType}!
                    </span>
                  ) : (
                    <span className={cn(
                      'font-medium',
                      currentPrizeType === 'Q' && 'text-green-600',
                      currentPrizeType === 'DQ' && 'text-purple-600',
                      currentPrizeType === 'CP' && 'text-yellow-600',
                    )}>
                      {getMissingCount(progress)} pour {currentPrizeType}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
