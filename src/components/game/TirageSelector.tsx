'use client';

import { useState } from 'react';
import { X, Calendar, Loader2, RefreshCw } from 'lucide-react';
import type { LotoTirage } from '@/types';
import { cn } from '@/lib/utils/cn';

interface TirageSelectorProps {
  tirages: LotoTirage[];
  currentTirageId?: string;
  isLoading: boolean;
  onSelect: (tirageId: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function TirageSelector({
  tirages,
  currentTirageId,
  isLoading,
  onSelect,
  onRefresh,
  onClose,
}: TirageSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--card)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="font-bold text-lg">Choisir un tirage</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
              title="Actualiser"
            >
              <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Liste des tirages */}
        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading && tirages.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : tirages.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <p>Aucun tirage disponible</p>
              <button
                onClick={onRefresh}
                className="mt-4 text-[var(--primary)] hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {tirages.map((tirage) => (
                <button
                  key={tirage.id}
                  onClick={() => {
                    onSelect(tirage.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full p-4 flex items-center gap-3 hover:bg-[var(--muted)] transition-colors text-left',
                    currentTirageId === tirage.id && 'bg-[var(--primary)]/10'
                  )}
                >
                  {/* Image du tirage */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--muted)]">
                    {tirage.imageUrl ? (
                      <img
                        src={tirage.imageUrl}
                        alt={tirage.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[var(--muted-foreground)]" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tirage.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{tirage.date}</p>
                    {tirage.prizes.length > 0 && (
                      <p className="text-xs text-[var(--primary)]">
                        {tirage.prizes.length} lots
                      </p>
                    )}
                  </div>

                  {/* Indicateur sélectionné */}
                  {currentTirageId === tirage.id && (
                    <div className="flex-shrink-0 w-3 h-3 rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]">
          <p className="text-xs text-center text-[var(--muted-foreground)]">
            Les lots sont chargés automatiquement depuis lotofiesta.fr
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour gérer l'ouverture/fermeture du sélecteur
 */
export function useTirageSelector() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
