'use client';

import { useState, useEffect } from 'react';
import { History, Trophy, Clock, Hash, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { GameHistory, GlobalStats } from '@/types';
import { cn } from '@/lib/utils/cn';

const WIN_LABELS = {
  quine: 'Quine',
  double_quine: 'Double Quine',
  carton_plein: 'Carton Plein',
};

const WIN_COLORS = {
  quine: 'bg-green-500',
  double_quine: 'bg-blue-500',
  carton_plein: 'bg-yellow-500',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}min ${secs}s`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch('/api/history'),
        fetch('/api/stats'),
      ]);
      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    if (!confirm('Supprimer tout l\'historique et les statistiques ?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
      setStats(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Stats globales */}
      {stats && stats.totalGames > 0 && (
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Statistiques globales
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[var(--muted)] rounded-lg p-2">
              <div className="text-[var(--muted-foreground)]">Parties jouées</div>
              <div className="font-bold text-lg">{stats.totalGames}</div>
            </div>
            <div className="bg-[var(--muted)] rounded-lg p-2">
              <div className="text-[var(--muted-foreground)]">Boules tirées</div>
              <div className="font-bold text-lg">{stats.totalBallsDrawn}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-2">
              <div className="text-green-600 dark:text-green-400">Quines</div>
              <div className="font-bold text-lg">{stats.totalQuines}</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2">
              <div className="text-blue-600 dark:text-blue-400">Double Quines</div>
              <div className="font-bold text-lg">{stats.totalDoubleQuines}</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2">
              <div className="text-yellow-600 dark:text-yellow-400">Cartons Pleins</div>
              <div className="font-bold text-lg">{stats.totalCartonsPlein}</div>
            </div>
            {stats.fastestQuine > 0 && stats.fastestQuine < 999 && (
              <div className="bg-purple-500/10 rounded-lg p-2">
                <div className="text-purple-600 dark:text-purple-400">Quine la plus rapide</div>
                <div className="font-bold text-lg">{stats.fastestQuine} boules</div>
              </div>
            )}
          </div>
          {stats.averageBallsToQuine > 0 && (
            <div className="mt-3 text-sm text-[var(--muted-foreground)]">
              Moyenne : {Math.round(stats.averageBallsToQuine)} boules pour une quine
              {stats.averageBallsToCartonPlein > 0 && (
                <>, {Math.round(stats.averageBallsToCartonPlein)} pour un carton plein</>
              )}
            </div>
          )}

          {/* Numéros les plus fréquents */}
          {Object.keys(stats.numberFrequency).length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Top 10 numéros les plus tirés :</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.numberFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([num, count]) => (
                    <span
                      key={num}
                      className="px-2 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded text-sm"
                      title={`${count} fois`}
                    >
                      {num} <span className="text-xs opacity-70">({count})</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historique */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des parties
          </h2>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-2 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded-lg"
              title="Supprimer l'historique"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune partie enregistrée</p>
            <p className="text-sm mt-1">Les parties seront sauvegardées automatiquement</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {history.map((game) => (
              <div key={game.id} className="p-3">
                <button
                  onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{formatDate(game.date)}</div>
                      <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {game.totalBalls} boules
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(game.duration)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Badges gains */}
                      <div className="flex gap-1">
                        {game.wins.filter(w => w.type === 'quine').length > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                            {game.wins.filter(w => w.type === 'quine').length} Q
                          </span>
                        )}
                        {game.wins.filter(w => w.type === 'double_quine').length > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                            {game.wins.filter(w => w.type === 'double_quine').length} DQ
                          </span>
                        )}
                        {game.wins.filter(w => w.type === 'carton_plein').length > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                            {game.wins.filter(w => w.type === 'carton_plein').length} CP
                          </span>
                        )}
                      </div>
                      {expandedGame === game.id ? (
                        <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Détails expandés */}
                {expandedGame === game.id && (
                  <div className="mt-3 space-y-3">
                    {/* Planches utilisées */}
                    <div className="text-sm">
                      <span className="text-[var(--muted-foreground)]">Planches : </span>
                      {game.plancheNames.join(', ')}
                    </div>

                    {/* Gains détaillés */}
                    {game.wins.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Gains :</div>
                        {game.wins.map((win, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'p-2 rounded-lg text-sm',
                              WIN_COLORS[win.type] + '/10'
                            )}
                          >
                            <div className="font-medium">{WIN_LABELS[win.type]}</div>
                            <div className="text-[var(--muted-foreground)]">
                              {win.plancheName} - Carton #{win.cartonPosition}
                              {win.cartonSerialNumber && ` (${win.cartonSerialNumber})`}
                              <br />
                              À la {win.atBallCount}ème boule (n°{win.atBallNumber})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Numéros tirés */}
                    <div>
                      <div className="text-sm font-medium mb-2">Numéros tirés :</div>
                      <div className="flex flex-wrap gap-1">
                        {game.drawnBalls.map((num, idx) => (
                          <span
                            key={idx}
                            className="w-7 h-7 flex items-center justify-center text-xs bg-blue-500 text-white rounded-full"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
