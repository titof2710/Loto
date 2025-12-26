'use client';

import { cn } from '@/lib/utils/cn';
import type { DrawnBall } from '@/types';

interface DrawnBallsProps {
  balls: DrawnBall[];
  maxDisplay?: number;
}

export function DrawnBalls({ balls, maxDisplay = 10 }: DrawnBallsProps) {
  const displayBalls = balls.slice(-maxDisplay).reverse();

  if (balls.length === 0) {
    return (
      <div className="text-center py-4 text-[var(--muted-foreground)]">
        Aucune boule tirée
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Dernières boules ({balls.length} total)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayBalls.map((ball, index) => (
          <div
            key={`${ball.number}-${ball.order}`}
            className={cn(
              'ball',
              index === 0
                ? 'bg-green-500 text-white ring-2 ring-green-300'
                : 'bg-[var(--primary)] text-white',
              ball.source === 'voice' && 'ring-2 ring-purple-400'
            )}
            title={ball.source === 'voice' ? 'Détecté par la voix' : 'Saisi manuellement'}
          >
            {ball.number}
          </div>
        ))}
      </div>
    </div>
  );
}
