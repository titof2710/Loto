'use client';

import { Gift, ChevronRight, Loader2 } from 'lucide-react';
import type { LotoPrize, PrizeType } from '@/types';
import { cn } from '@/lib/utils/cn';

interface CurrentPrizeProps {
  prize: LotoPrize | null;
  tirageName?: string;
  isLoading?: boolean;
  onChangeTirage?: () => void;
}

// Couleurs par type de gain
const typeColors: Record<PrizeType, { bg: string; text: string; badge: string }> = {
  'Q': {
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  'DQ': {
    bg: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  'CP': {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
};

// Labels des types
const typeLabels: Record<PrizeType, string> = {
  'Q': 'Quine',
  'DQ': 'Double Quine',
  'CP': 'Carton Plein',
};

export function CurrentPrize({ prize, tirageName, isLoading, onChangeTirage }: CurrentPrizeProps) {
  if (isLoading) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des lots...</span>
        </div>
      </div>
    );
  }

  if (!prize) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Gift className="w-5 h-5" />
            <span>Aucun lot disponible</span>
          </div>
          {onChangeTirage && (
            <button
              onClick={onChangeTirage}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Choisir un tirage
            </button>
          )}
        </div>
      </div>
    );
  }

  const colors = typeColors[prize.type];

  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all',
      prize.type === 'Q' && 'border-green-500 bg-green-500/5',
      prize.type === 'DQ' && 'border-purple-500 bg-purple-500/5',
      prize.type === 'CP' && 'border-yellow-500 bg-yellow-500/5',
    )}>
      {/* En-tête avec nom du tirage */}
      {tirageName && (
        <div className="px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-medium truncate">{tirageName}</span>
          {onChangeTirage && (
            <button
              onClick={onChangeTirage}
              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              Changer
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Cadeau actuel */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Badge type */}
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg',
            colors.bg
          )}>
            {prize.type}
          </div>

          {/* Détails */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', colors.badge)}>
                {typeLabels[prize.type]}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Lot #{prize.number}
              </span>
            </div>
            <p className={cn('font-bold text-lg leading-tight', colors.text)}>
              {prize.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton "Cadeau gagné" pour passer au lot suivant
 */
interface PrizeWonButtonProps {
  onClick: () => void;
  isLastInGroup: boolean;
  disabled?: boolean;
}

export function PrizeWonButton({ onClick, isLastInGroup, disabled }: PrizeWonButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-all',
        'shadow-lg hover:shadow-xl active:scale-95',
        isLastInGroup
          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Gift className="w-6 h-6" />
      <span className="text-lg">
        {isLastInGroup ? 'Nouveau cadeau' : 'Cadeau gagné'}
      </span>
    </button>
  );
}
