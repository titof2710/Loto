'use client';

import Link from 'next/link';
import { Camera, Play, Grid3X3, Mic } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';

export default function HomePage() {
  const { planches, isPlaying, drawnBalls } = useGameStore();
  const totalCartons = planches.reduce((acc, p) => acc + p.cartons.length, 0);

  return (
    <div className="p-4 space-y-6">
      {/* Hero */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold mb-2">Loto Fiesta</h2>
        <p className="text-[var(--muted-foreground)]">
          Suivez vos cartons en direct
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--primary)]">{planches.length}</div>
          <div className="text-sm text-[var(--muted-foreground)]">Planches</div>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="text-2xl font-bold text-[var(--primary)]">{totalCartons}</div>
          <div className="text-sm text-[var(--muted-foreground)]">Cartons</div>
        </div>
      </div>

      {/* État partie en cours */}
      {isPlaying && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-green-600 dark:text-green-400">Partie en cours</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {drawnBalls.length} boules tirées
          </p>
          <Link
            href="/game"
            className="mt-3 block w-full py-2 px-4 bg-green-500 text-white text-center rounded-lg font-medium"
          >
            Continuer la partie
          </Link>
        </div>
      )}

      {/* Actions principales */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Actions</h3>

        <Link
          href="/scan"
          className="flex items-center gap-4 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Scanner une planche</div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Photographiez vos 12 cartons
            </div>
          </div>
        </Link>

        <Link
          href="/game"
          className="flex items-center gap-4 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              {isPlaying ? 'Continuer la partie' : 'Nouvelle partie'}
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              {planches.length > 0
                ? `${totalCartons} cartons prêts`
                : 'Ajoutez des cartons pour commencer'}
            </div>
          </div>
        </Link>
      </div>

      {/* Fonctionnalités */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Fonctionnalités</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-[var(--muted)] rounded-xl">
            <Grid3X3 className="w-6 h-6 text-[var(--primary)] mb-2" />
            <div className="text-sm font-medium">OCR Intelligent</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Scan automatique des cartons
            </div>
          </div>
          <div className="p-4 bg-[var(--muted)] rounded-xl">
            <Mic className="w-6 h-6 text-[var(--primary)] mb-2" />
            <div className="text-sm font-medium">Voix</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              Détection des numéros annoncés
            </div>
          </div>
        </div>
      </div>

      {/* Planches existantes */}
      {planches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Mes planches</h3>
          <div className="space-y-2">
            {planches.map((planche) => (
              <div
                key={planche.id}
                className="flex items-center justify-between p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]"
              >
                <div>
                  <div className="font-medium">{planche.name}</div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {planche.cartons.length} cartons
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
