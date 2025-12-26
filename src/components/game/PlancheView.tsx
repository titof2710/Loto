'use client';

import { cn } from '@/lib/utils/cn';
import type { Planche, CartonProgress } from '@/types';
import { CartonGrid } from './CartonGrid';
import { Trophy, AlertCircle } from 'lucide-react';

interface PlancheViewProps {
  planche: Planche;
  cartonsProgress: CartonProgress[];
}

export function PlancheView({ planche, cartonsProgress }: PlancheViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{planche.name}</h3>
        <span className="text-sm text-[var(--muted-foreground)]">
          {planche.cartons.length} cartons
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {planche.cartons.map((carton) => {
          const progress = cartonsProgress.find((p) => p.cartonId === carton.id);
          const completedLines = progress?.linesCompleted.filter(Boolean).length || 0;
          const missingForQuine = progress?.missingForQuine.length || 5;
          const isCloseToWin = missingForQuine === 1;

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
                  {carton.serialNumber && (
                    <span className="text-xs font-mono font-bold text-[var(--primary)]">
                      {carton.serialNumber}
                    </span>
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
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {progress.markedNumbers.length}/15
                  {isCloseToWin && (
                    <span className="ml-1 text-orange-500 font-bold">
                      Plus qu'un !
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
