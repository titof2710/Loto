'use client';

import { useGameStore } from '@/stores/gameStore';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Loto Fiesta' }: HeaderProps) {
  const { isPlaying, drawnBalls } = useGameStore();

  return (
    <header className="sticky top-0 z-40 bg-[var(--card)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold">{title}</h1>

        {isPlaying && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted-foreground)]">
              {drawnBalls.length} boules
            </span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}
      </div>
    </header>
  );
}
