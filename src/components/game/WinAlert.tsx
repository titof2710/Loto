'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import type { WinEvent } from '@/types';
import { cn } from '@/lib/utils/cn';

interface WinAlertProps {
  win: WinEvent;
  onDismiss: () => void;
}

const winTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  quine: { label: 'QUINE !', color: 'bg-green-500', icon: '1' },
  double_quine: { label: 'DOUBLE QUINE !', color: 'bg-purple-500', icon: '2' },
  carton_plein: { label: 'CARTON PLEIN !', color: 'bg-yellow-500', icon: '3' },
};

export function WinAlert({ win, onDismiss }: WinAlertProps) {
  const [visible, setVisible] = useState(true);
  const config = winTypeLabels[win.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={cn(
          'relative p-8 rounded-2xl text-white text-center animate-pulse-alert',
          config.color
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </button>

        <Trophy className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">{config.label}</h2>
        {win.serialNumber && (
          <div className="bg-white/20 rounded-lg px-4 py-2 mb-3">
            <p className="text-sm opacity-80">Numéro de série</p>
            <p className="text-2xl font-bold tracking-wider">{win.serialNumber}</p>
          </div>
        )}
        <p className="text-lg opacity-90">
          {win.cartonPosition && `Carton #${win.cartonPosition} • `}Boule n°{win.atBallNumber}
        </p>
        {win.serialNumber && (
          <p className="text-sm mt-3 opacity-75">
            Communiquez ce numéro pour valider votre gain
          </p>
        )}
      </div>
    </div>
  );
}
