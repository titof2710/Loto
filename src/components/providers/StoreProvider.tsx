'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const loadPlanches = useGameStore((state) => state.loadPlanches);

  useEffect(() => {
    loadPlanches();
  }, [loadPlanches]);

  return <>{children}</>;
}
