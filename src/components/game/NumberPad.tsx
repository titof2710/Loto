'use client';

import { cn } from '@/lib/utils/cn';

interface NumberPadProps {
  drawnNumbers: number[];
  onNumberSelect: (num: number) => void;
  onUndo: () => void;
  disabled?: boolean;
}

export function NumberPad({ drawnNumbers, onNumberSelect, onUndo, disabled }: NumberPadProps) {
  const lastDrawn = drawnNumbers[drawnNumbers.length - 1];

  return (
    <div className="space-y-2">
      {/* Grille 9x10 pour les numéros 1-90 */}
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
          const isDrawn = drawnNumbers.includes(num);
          const isLast = num === lastDrawn;

          return (
            <button
              key={num}
              onClick={() => !isDrawn && !disabled && onNumberSelect(num)}
              disabled={isDrawn || disabled}
              className={cn(
                'aspect-square rounded-lg font-bold text-sm transition-all',
                'flex items-center justify-center',
                isDrawn
                  ? isLast
                    ? 'bg-green-500 text-white ring-2 ring-green-300'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] opacity-50'
                  : 'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] active:scale-95'
              )}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Bouton annuler */}
      <button
        onClick={onUndo}
        disabled={drawnNumbers.length === 0 || disabled}
        className={cn(
          'w-full py-3 rounded-lg font-medium transition-colors',
          drawnNumbers.length === 0 || disabled
            ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            : 'bg-[var(--destructive)] text-white hover:opacity-90'
        )}
      >
        Annuler le dernier ({lastDrawn || '-'})
      </button>
    </div>
  );
}
