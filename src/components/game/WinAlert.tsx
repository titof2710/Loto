'use client';

import { useEffect, useState, useRef } from 'react';
import { Trophy, X, Share2, Download, Check } from 'lucide-react';
import type { WinEvent, LotoPrize } from '@/types';
import { cn } from '@/lib/utils/cn';

interface WinAlertProps {
  win: WinEvent;
  prize?: LotoPrize | null; // Le cadeau gagné
  onDismiss: () => void;
}

const winTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  quine: { label: 'QUINE !', color: 'bg-green-500', icon: '1' },
  double_quine: { label: 'DOUBLE QUINE !', color: 'bg-purple-500', icon: '2' },
  carton_plein: { label: 'CARTON PLEIN !', color: 'bg-yellow-500', icon: '3' },
};

export function WinAlert({ win, prize, onDismiss }: WinAlertProps) {
  const [visible, setVisible] = useState(true);
  const [shared, setShared] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const config = winTypeLabels[win.type];

  // Log pour debug
  console.log('WinAlert affichée:', win);

  // Fonction pour générer l'image de partage
  const generateShareImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dimensions
    canvas.width = 600;
    canvas.height = 400;

    // Fond dégradé selon le type de gain
    const colors = {
      quine: ['#22c55e', '#16a34a'],
      double_quine: ['#a855f7', '#7e22ce'],
      carton_plein: ['#eab308', '#ca8a04'],
    };
    const [color1, color2] = colors[win.type] || colors.quine;

    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    // Texte
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    // Titre
    ctx.font = 'bold 48px system-ui';
    ctx.fillText(config.label, 300, 100);

    // Numéro de série
    ctx.font = 'bold 36px system-ui';
    ctx.fillText(win.serialNumber || `Carton #${win.cartonPosition || '?'}`, 300, 180);

    // Détails
    ctx.font = '24px system-ui';
    ctx.fillText(`Carton #${win.cartonPosition || '?'} - Boule n°${win.atBallNumber}`, 300, 240);

    // Date/heure
    ctx.font = '18px system-ui';
    ctx.globalAlpha = 0.8;
    ctx.fillText(new Date().toLocaleString('fr-FR'), 300, 290);

    // Logo
    ctx.globalAlpha = 0.7;
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('Loto Fiesta', 300, 360);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // Partager
  const handleShare = async () => {
    try {
      const blob = await generateShareImage();
      if (!blob) return;

      const file = new File([blob], 'loto-fiesta-win.png', { type: 'image/png' });
      const shareData = {
        title: `${config.label} - Loto Fiesta`,
        text: `J'ai gagné une ${win.type === 'quine' ? 'quine' : win.type === 'double_quine' ? 'double quine' : 'carton plein'} au Loto Fiesta ! Carton ${win.serialNumber || `#${win.cartonPosition}`}`,
        files: [file],
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } else {
        // Fallback: télécharger l'image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'loto-fiesta-win.png';
        a.click();
        URL.revokeObjectURL(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  useEffect(() => {
    // Durée plus longue pour avoir le temps de noter le numéro de série
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 30000); // 30 secondes au lieu de 5

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

        {/* Numéro de série - toujours afficher la section */}
        <div className="bg-white/20 rounded-lg px-4 py-2 mb-3">
          <p className="text-sm opacity-80">Numéro de série</p>
          <p className="text-2xl font-bold tracking-wider">
            {win.serialNumber || `Carton #${win.cartonPosition || '?'}`}
          </p>
        </div>

        <p className="text-lg opacity-90">
          Carton #{win.cartonPosition || '?'} - Boule n°{win.atBallNumber}
        </p>

        {/* Cadeau gagné */}
        {prize && (
          <div className="bg-white/20 rounded-lg px-4 py-3 mt-3">
            <p className="text-sm opacity-80 mb-1">Vous avez gagné :</p>
            <p className="text-xl font-bold">🎁 {prize.description}</p>
          </div>
        )}

        <p className="text-sm mt-3 opacity-75">
          {win.serialNumber
            ? 'Communiquez ce numéro pour valider votre gain'
            : 'Notez la position du carton gagnant'}
        </p>

        {/* Boutons d'action */}
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/30 rounded-lg font-medium hover:bg-white/40 transition-colors"
          >
            {shared ? (
              <>
                <Check className="w-5 h-5" />
                Partagé !
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                Partager
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-white/30 rounded-lg font-medium hover:bg-white/40 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
