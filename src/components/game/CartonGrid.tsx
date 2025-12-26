'use client';

import { cn } from '@/lib/utils/cn';
import type { Carton, CartonProgress } from '@/types';

interface CartonGridProps {
  carton: Carton;
  progress?: CartonProgress;
  compact?: boolean;
}

export function CartonGrid({ carton, progress, compact = false }: CartonGridProps) {
  const markedNumbers = progress?.markedNumbers || [];

  return (
    <div
      className={cn(
        'grid grid-cols-9 gap-px bg-[var(--border)] rounded-lg overflow-hidden',
        compact ? 'text-xs' : 'text-sm'
      )}
    >
      {carton.grid.flat().map((cell, index) => {
        const isMarked = cell.value !== null && markedNumbers.includes(cell.value);
        const isEmpty = cell.value === null;

        return (
          <div
            key={index}
            className={cn(
              'carton-cell',
              compact ? 'h-6' : 'h-8',
              isEmpty && 'empty',
              isMarked && 'marked'
            )}
          >
            {cell.value}
          </div>
        );
      })}
    </div>
  );
}
