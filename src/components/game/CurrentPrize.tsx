'use client';

import { useState } from 'react';
import { Gift, ChevronRight, Loader2, List, X, AlertTriangle } from 'lucide-react';
import type { LotoPrize, PrizeType } from '@/types';
import { cn } from '@/lib/utils/cn';

interface CurrentPrizeProps {
  prize: LotoPrize | null;
  prizeNumber?: number; // Numéro du lot attendu (pour afficher "Lot #X non trouvé")
  tirageName?: string;
  allPrizes?: LotoPrize[]; // Tous les lots pour la modal
  isLoading?: boolean;
  onChangeTirage?: () => void;
  onSkipToNext?: () => void; // Pour passer au lot suivant si celui-ci manque
  onSelectType?: (type: PrizeType) => void; // Pour sélectionner manuellement le type quand OCR échoue
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

export function CurrentPrize({
  prize,
  prizeNumber,
  tirageName,
  allPrizes,
  isLoading,
  onChangeTirage,
  onSkipToNext,
  onSelectType
}: CurrentPrizeProps) {
  const [showAllPrizes, setShowAllPrizes] = useState(false);

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

  // Lot non trouvé mais on peut continuer - demander le type
  if (!prize && prizeNumber) {
    return (
      <>
        <div className="bg-[var(--card)] rounded-xl border-2 border-orange-500 overflow-hidden">
          {/* En-tête */}
          {tirageName && (
            <div className="px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-sm font-medium truncate">{tirageName}</span>
              <div className="flex items-center gap-2">
                {allPrizes && allPrizes.length > 0 && (
                  <button
                    onClick={() => setShowAllPrizes(true)}
                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <List className="w-3 h-3" />
                    Tous les lots
                  </button>
                )}
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
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-orange-600 dark:text-orange-400 font-medium">
                  Lot #{prizeNumber} non trouvé
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Sélectionnez le type de lot :
                </p>
              </div>
            </div>

            {/* Boutons de sélection du type */}
            {onSelectType && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelectType('Q')}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
                >
                  <span className="text-lg">Q</span>
                  <span className="text-xs opacity-90">Quine</span>
                </button>
                <button
                  onClick={() => onSelectType('DQ')}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-purple-500 text-white font-bold hover:bg-purple-600 transition-colors"
                >
                  <span className="text-lg">DQ</span>
                  <span className="text-xs opacity-90">Double Q</span>
                </button>
                <button
                  onClick={() => onSelectType('CP')}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-colors"
                >
                  <span className="text-lg">CP</span>
                  <span className="text-xs opacity-90">Carton P</span>
                </button>
              </div>
            )}

            {/* Bouton passer si pas de sélection de type */}
            {!onSelectType && onSkipToNext && (
              <button
                onClick={onSkipToNext}
                className="w-full px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
              >
                Passer au suivant →
              </button>
            )}
          </div>
        </div>

        {/* Modal tous les lots */}
        {showAllPrizes && allPrizes && (
          <AllPrizesModal
            prizes={allPrizes}
            currentNumber={prizeNumber}
            onClose={() => setShowAllPrizes(false)}
          />
        )}
      </>
    );
  }

  // Aucun lot du tout
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
    <>
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
            <div className="flex items-center gap-2">
              {allPrizes && allPrizes.length > 0 && (
                <button
                  onClick={() => setShowAllPrizes(true)}
                  className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <List className="w-3 h-3" />
                  Tous les lots
                </button>
              )}
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

      {/* Modal tous les lots */}
      {showAllPrizes && allPrizes && (
        <AllPrizesModal
          prizes={allPrizes}
          currentNumber={prize.number}
          onClose={() => setShowAllPrizes(false)}
        />
      )}
    </>
  );
}

/**
 * Modal affichant tous les lots du tirage
 */
interface AllPrizesModalProps {
  prizes: LotoPrize[];
  currentNumber?: number;
  onClose: () => void;
}

function AllPrizesModal({ prizes, currentNumber, onClose }: AllPrizesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--card)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="font-bold text-lg">Tous les lots ({prizes.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liste des lots */}
        <div className="overflow-y-auto max-h-[60vh] divide-y divide-[var(--border)]">
          {prizes.map((prize) => {
            const colors = typeColors[prize.type];
            const isCurrent = prize.number === currentNumber;

            return (
              <div
                key={prize.number}
                className={cn(
                  'p-3 flex items-center gap-3',
                  isCurrent && 'bg-[var(--primary)]/10'
                )}
              >
                {/* Badge type */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold',
                  colors.bg
                )}>
                  {prize.type}
                </div>

                {/* Détails */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      #{prize.number}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', colors.badge)}>
                      {typeLabels[prize.type]}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">
                        En cours
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {prize.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[var(--primary)] text-white rounded-lg font-medium"
          >
            Fermer
          </button>
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
