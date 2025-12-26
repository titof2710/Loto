'use client';

import { Volume2, VolumeX, Vibrate, Bell, BellOff, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { cn } from '@/lib/utils/cn';

export default function SettingsPage() {
  const {
    soundEnabled,
    vibrationEnabled,
    alertsEnabled,
    setSoundEnabled,
    setVibrationEnabled,
    setAlertsEnabled,
  } = useSettingsStore();

  const { planches, clearPlanches, resetGame } = useGameStore();

  const handleClearAll = () => {
    if (confirm('Voulez-vous vraiment supprimer toutes les planches et réinitialiser la partie ?')) {
      clearPlanches();
      resetGame();
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Réglages</h2>

      {/* Section Sons & Alertes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Sons & Alertes
        </h3>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {/* Sons */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[var(--primary)]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[var(--muted-foreground)]" />
              )}
              <div className="text-left">
                <div className="font-medium">Sons</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Sons lors des gains et alertes
                </div>
              </div>
            </div>
            <div
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                soundEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
          </button>

          {/* Vibration */}
          <button
            onClick={() => setVibrationEnabled(!vibrationEnabled)}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              <Vibrate
                className={cn(
                  'w-5 h-5',
                  vibrationEnabled
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)]'
                )}
              />
              <div className="text-left">
                <div className="font-medium">Vibration</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Vibrer lors des alertes (mobile)
                </div>
              </div>
            </div>
            <div
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                vibrationEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
          </button>

          {/* Alertes */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              {alertsEnabled ? (
                <Bell className="w-5 h-5 text-[var(--primary)]" />
              ) : (
                <BellOff className="w-5 h-5 text-[var(--muted-foreground)]" />
              )}
              <div className="text-left">
                <div className="font-medium">Alertes "plus qu'un"</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Alerter quand il ne manque qu'un numéro
                </div>
              </div>
            </div>
            <div
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                alertsEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  alertsEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Section Données */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Données
        </h3>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Planches en mémoire</span>
              <span className="text-[var(--muted-foreground)]">
                {planches.length} planche{planches.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              Total: {planches.reduce((acc, p) => acc + p.cartons.length, 0)} cartons
            </div>
          </div>
        </div>

        <button
          onClick={handleClearAll}
          className="flex items-center justify-center gap-2 w-full p-4 bg-[var(--destructive)]/10 text-[var(--destructive)] rounded-xl border border-[var(--destructive)]/30"
        >
          <Trash2 className="w-5 h-5" />
          Tout supprimer
        </button>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-[var(--muted-foreground)] pt-4">
        <p>Loto Fiesta v1.0.0</p>
        <p className="mt-1">Pour Loto Fiesta sur YouTube</p>
      </div>
    </div>
  );
}
