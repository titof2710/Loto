'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Edit3, Check, X, Shuffle, Loader2, AlertCircle } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { generateRandomPlanche, createCartonFromNumbers } from '@/lib/game/cartonUtils';
import { CartonGrid } from '@/components/game/CartonGrid';
import { useOCR } from '@/hooks/useOCR';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Planche, Carton } from '@/types';

type Mode = 'choose' | 'camera' | 'ocr-result' | 'manual' | 'edit';

export default function ScanPage() {
  const router = useRouter();
  const { addPlanche } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('choose');
  const [plancheName, setPlancheName] = useState('');
  const [currentCartonIndex, setCurrentCartonIndex] = useState(0);
  const [cartonNumbers, setCartonNumbers] = useState<string>('');
  const [cartons, setCartons] = useState<Carton[]>([]);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // OCR Hook
  const { isProcessing, progress, result: ocrResult, error: ocrError, processImage, reset: resetOCR } = useOCR();

  // Ajouter une planche générée aléatoirement (pour test)
  const handleGenerateRandom = () => {
    const name = plancheName || `Planche ${new Date().toLocaleTimeString('fr-FR')}`;
    const planche = generateRandomPlanche(name);
    addPlanche(planche);
    router.push('/game');
  };

  // Gérer la capture/upload d'image
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Afficher l'image
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    setMode('ocr-result');

    // Lancer l'OCR
    await processImage(file);
  };

  // Utiliser les résultats OCR
  const handleUseOCRResult = () => {
    if (ocrResult && ocrResult.numbers.length > 0) {
      setCartonNumbers(ocrResult.numbers.join(' '));
      setMode('manual');
    }
  };

  // Parser les numéros entrés
  const parseNumbers = (input: string): number[] => {
    const nums = input
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 90);
    return [...new Set(nums)]; // Enlever les doublons
  };

  // Ajouter un carton
  const handleAddCarton = () => {
    setError('');
    const numbers = parseNumbers(cartonNumbers);

    if (numbers.length !== 15) {
      setError(`Vous avez entré ${numbers.length} numéros. Il en faut exactement 15.`);
      return;
    }

    const carton = createCartonFromNumbers(numbers, cartons.length);
    if (!carton) {
      setError('Les numéros ne forment pas un carton valide. Vérifiez les règles du loto.');
      return;
    }

    setCartons([...cartons, carton]);
    setCartonNumbers('');
    setCurrentCartonIndex(cartons.length + 1);

    if (cartons.length + 1 >= 12) {
      setMode('edit');
    }
  };

  // Sauvegarder la planche
  const handleSave = () => {
    if (cartons.length === 0) {
      setError('Ajoutez au moins un carton.');
      return;
    }

    const planche: Planche = {
      id: uuidv4(),
      name: plancheName || `Planche ${new Date().toLocaleTimeString('fr-FR')}`,
      cartons,
      imageUrl: capturedImage || undefined,
    };

    addPlanche(planche);
    router.push('/game');
  };

  // Retour au choix
  const handleBack = () => {
    setMode('choose');
    setCapturedImage(null);
    resetOCR();
    setCartonNumbers('');
    setError('');
  };

  // Mode choix
  if (mode === 'choose') {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center py-6">
          <h2 className="text-xl font-bold mb-2">Ajouter une planche</h2>
          <p className="text-[var(--muted-foreground)]">
            Scannez ou saisissez vos 12 cartons
          </p>
        </div>

        {/* Nom de la planche */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom de la planche</label>
          <input
            type="text"
            value={plancheName}
            onChange={(e) => setPlancheName(e.target.value)}
            placeholder="Ex: Planche bleue"
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
          />
        </div>

        <div className="space-y-3">
          {/* Prendre une photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Prendre une photo</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Scanner un carton avec la caméra
              </div>
            </div>
          </button>

          {/* Importer une image */}
          <label className="flex items-center gap-4 w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Importer une image</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Depuis votre galerie
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageCapture}
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
          />

          {/* Saisie manuelle */}
          <button
            onClick={() => setMode('manual')}
            className="flex items-center gap-4 w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Saisie manuelle</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Entrez les numéros de chaque carton
              </div>
            </div>
          </button>

          {/* Génération aléatoire (pour test) */}
          <button
            onClick={handleGenerateRandom}
            className="flex items-center gap-4 w-full p-4 bg-[var(--muted)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Shuffle className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Générer aléatoirement</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Pour tester l'application
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Mode résultat OCR
  if (mode === 'ocr-result') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-[var(--muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Analyse OCR</h2>
          <div className="w-9" />
        </div>

        {/* Image capturée */}
        {capturedImage && (
          <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
            <img src={capturedImage} alt="Carton scanné" className="w-full" />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Analyse en cours... {Math.round(progress * 100)}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Résultats OCR */}
        {!isProcessing && ocrResult && (
          <div className="space-y-3">
            <div className="p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Numéros détectés</span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  Confiance: {Math.round(ocrResult.confidence)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ocrResult.numbers.length > 0 ? (
                  ocrResult.numbers.map((num) => (
                    <span
                      key={num}
                      className="px-2 py-1 bg-[var(--primary)] text-white rounded text-sm font-bold"
                    >
                      {num}
                    </span>
                  ))
                ) : (
                  <span className="text-[var(--muted-foreground)]">Aucun numéro détecté</span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                {ocrResult.numbers.length} numéros trouvés
              </p>
            </div>

            {ocrError && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-600 dark:text-orange-400">{ocrError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUseOCRResult}
                disabled={ocrResult.numbers.length === 0}
                className={cn(
                  'flex-1 py-3 rounded-lg font-medium',
                  ocrResult.numbers.length > 0
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                )}
              >
                Utiliser ces numéros
              </button>
              <button
                onClick={() => setMode('manual')}
                className="flex-1 py-3 rounded-lg font-medium bg-[var(--muted)]"
              >
                Saisie manuelle
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-lg font-medium border border-[var(--border)]"
            >
              Rescanner
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageCapture}
        />
      </div>
    );
  }

  // Mode saisie manuelle
  if (mode === 'manual') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-[var(--muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Carton {currentCartonIndex + 1}/12</h2>
          <button
            onClick={handleSave}
            disabled={cartons.length === 0}
            className={cn(
              'p-2 -mr-2',
              cartons.length > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
            )}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>

        {/* Progression */}
        <div className="flex gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full',
                i < cartons.length
                  ? 'bg-green-500'
                  : i === cartons.length
                  ? 'bg-[var(--primary)]'
                  : 'bg-[var(--muted)]'
              )}
            />
          ))}
        </div>

        {/* Zone de saisie */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Entrez les 15 numéros du carton (séparés par des espaces ou virgules)
          </label>
          <textarea
            value={cartonNumbers}
            onChange={(e) => setCartonNumbers(e.target.value)}
            placeholder="Ex: 3 12 24 35 48 7 19 29 42 56 61 73 85 68 90"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] resize-none font-mono"
          />
          <div className="text-sm text-[var(--muted-foreground)]">
            {parseNumbers(cartonNumbers).length}/15 numéros
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAddCarton}
          disabled={parseNumbers(cartonNumbers).length !== 15}
          className={cn(
            'w-full py-3 rounded-lg font-medium transition-colors',
            parseNumbers(cartonNumbers).length === 15
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
          )}
        >
          Ajouter ce carton
        </button>

        {/* Cartons déjà ajoutés */}
        {cartons.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Cartons ajoutés</h3>
            <div className="grid grid-cols-2 gap-2">
              {cartons.map((carton, i) => (
                <div
                  key={carton.id}
                  className="p-2 bg-[var(--card)] rounded-lg border border-[var(--border)]"
                >
                  <div className="text-xs text-[var(--muted-foreground)] mb-1">Carton #{i + 1}</div>
                  <CartonGrid carton={carton} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton terminer */}
        {cartons.length > 0 && (
          <button
            onClick={handleSave}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium"
          >
            Terminer avec {cartons.length} carton{cartons.length > 1 ? 's' : ''}
          </button>
        )}
      </div>
    );
  }

  return null;
}
