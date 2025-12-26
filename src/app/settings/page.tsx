'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Vibrate, Bell, BellOff, Trash2, Eye, User, LogOut, Key, UserX, Loader2, ChevronRight } from 'lucide-react';
import { useSettingsStore, type ColorBlindMode } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils/cn';

const colorBlindModes: { value: ColorBlindMode; label: string; description: string }[] = [
  { value: 'none', label: 'Normal', description: 'Vision normale' },
  { value: 'deuteranopia', label: 'Deutéranopie', description: 'Confusion vert-rouge (la plus courante)' },
  { value: 'protanopia', label: 'Protanopie', description: 'Difficulté à voir le rouge' },
  { value: 'tritanopia', label: 'Tritanopie', description: 'Difficulté à voir le bleu' },
];

export default function SettingsPage() {
  const {
    soundEnabled,
    vibrationEnabled,
    alertsEnabled,
    colorBlindMode,
    setSoundEnabled,
    setVibrationEnabled,
    setAlertsEnabled,
    setColorBlindMode,
  } = useSettingsStore();

  const { planches, clearPlanches, resetGame } = useGameStore();
  const { user, logout } = useAuthStore();

  // États pour les modals/sections
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClearAll = () => {
    if (confirm('Voulez-vous vraiment supprimer toutes les planches et réinitialiser la partie ?')) {
      clearPlanches();
      resetGame();
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors du changement');
      } else {
        setSuccess('Mot de passe modifié avec succès');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setShowChangePassword(false), 1500);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!confirm('ATTENTION: Cette action est irréversible. Toutes vos données seront supprimées. Continuer ?')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la suppression');
      } else {
        window.location.href = '/login';
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Réglages</h2>

      {/* Section Compte */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Compte
        </h3>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {/* Email */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[var(--primary)]" />
              <div className="text-left">
                <div className="font-medium">Email</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {user?.email || 'Non connecté'}
                </div>
              </div>
            </div>
          </div>

          {/* Changer mot de passe */}
          <button
            onClick={() => {
              setShowChangePassword(!showChangePassword);
              setShowDeleteAccount(false);
              setError('');
              setSuccess('');
            }}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[var(--primary)]" />
              <div className="text-left">
                <div className="font-medium">Changer le mot de passe</div>
              </div>
            </div>
            <ChevronRight className={cn('w-5 h-5 text-[var(--muted-foreground)] transition-transform', showChangePassword && 'rotate-90')} />
          </button>

          {/* Formulaire changer mot de passe */}
          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="p-4 bg-[var(--muted)]/30 space-y-3">
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-2 bg-green-500/10 border border-green-500/50 rounded text-green-500 text-sm">
                  {success}
                </div>
              )}
              <input
                type="password"
                placeholder="Ancien mot de passe"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
              />
              <input
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Modifier
              </button>
            </form>
          )}

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-orange-500" />
              <div className="text-left">
                <div className="font-medium text-orange-500">Se déconnecter</div>
              </div>
            </div>
          </button>

          {/* Supprimer compte */}
          <button
            onClick={() => {
              setShowDeleteAccount(!showDeleteAccount);
              setShowChangePassword(false);
              setError('');
            }}
            className="flex items-center justify-between w-full p-4"
          >
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-[var(--destructive)]" />
              <div className="text-left">
                <div className="font-medium text-[var(--destructive)]">Supprimer mon compte</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Action irréversible
                </div>
              </div>
            </div>
            <ChevronRight className={cn('w-5 h-5 text-[var(--muted-foreground)] transition-transform', showDeleteAccount && 'rotate-90')} />
          </button>

          {/* Formulaire supprimer compte */}
          {showDeleteAccount && (
            <form onSubmit={handleDeleteAccount} className="p-4 bg-red-500/5 space-y-3">
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
                  {error}
                </div>
              )}
              <p className="text-sm text-[var(--muted-foreground)]">
                Entrez votre mot de passe pour confirmer la suppression de votre compte et de toutes vos données.
              </p>
              <input
                type="password"
                placeholder="Mot de passe"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-red-500/50 bg-[var(--background)] text-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-[var(--destructive)] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Supprimer définitivement
              </button>
            </form>
          )}
        </div>
      </div>

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

      {/* Section Accessibilité */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Accessibilité
        </h3>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="w-5 h-5 text-[var(--primary)]" />
            <div>
              <div className="font-medium">Mode daltonien</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Adapter les couleurs pour une meilleure visibilité
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {colorBlindModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setColorBlindMode(mode.value)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                  colorBlindMode === mode.value
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                )}
              >
                <div>
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {mode.description}
                  </div>
                </div>
                {colorBlindMode === mode.value && (
                  <div className="w-4 h-4 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            ))}
          </div>
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
