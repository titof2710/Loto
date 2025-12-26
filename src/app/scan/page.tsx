'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Edit3, Check, X, Shuffle, Loader2, AlertCircle, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { generateRandomPlanche, createCartonFromNumbers } from '@/lib/game/cartonUtils';
import { CartonGrid } from '@/components/game/CartonGrid';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Planche, Carton } from '@/types';
import { detectCartons, type DetectedCarton } from '@/lib/ocr/cartonDetection';
import { extractNumbersFromImage, validateCartonNumbers } from '@/lib/ocr/tesseractOCR';

type Mode = 'choose' | 'camera' | 'detecting' | 'ocr-processing' | 'ocr-results' | 'manual' | 'edit';

interface CartonResult {
  index: number;
  numbers: number[];
  isValid: boolean;
  imageData: string;
  isEditing: boolean;
  editText: string;
}

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

  // État OCR
  const [detectedCartons, setDetectedCartons] = useState<DetectedCarton[]>([]);
  const [ocrResults, setOcrResults] = useState<CartonResult[]>([]);
  const [currentOcrCarton, setCurrentOcrCarton] = useState(0);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [selectedCartonIndex, setSelectedCartonIndex] = useState(0);

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
    setMode('detecting');
    setError('');

    try {
      // Détecter les cartons sur la planche avec la nouvelle méthode
      const detected = await detectCartons(file);
      setDetectedCartons(detected);

      if (detected.length === 0) {
        setError('Aucun carton détecté. Essayez avec une meilleure photo ou la saisie manuelle.');
        setMode('choose');
        return;
      }

      // Lancer l'OCR sur chaque carton détecté
      setMode('ocr-processing');
      setOcrProgress({ current: 0, total: detected.length, percentage: 0 });

      const cartonResults: CartonResult[] = [];

      for (let i = 0; i < detected.length; i++) {
        const carton = detected[i];
        setCurrentOcrCarton(i);
        setOcrProgress({
          current: i,
          total: detected.length,
          percentage: (i / detected.length) * 100,
        });

        try {
          const ocrResult = await extractNumbersFromImage(carton.imageData, (p) => {
            setOcrProgress({
              current: i,
              total: detected.length,
              percentage: ((i + p) / detected.length) * 100,
            });
          });

          const validation = validateCartonNumbers(ocrResult.numbers);
          cartonResults.push({
            index: carton.index,
            numbers: ocrResult.numbers,
            isValid: validation.valid,
            imageData: carton.imageData,
            isEditing: false,
            editText: ocrResult.numbers.join(' '),
          });
        } catch (err) {
          console.error(`Erreur OCR carton ${i}:`, err);
          cartonResults.push({
            index: carton.index,
            numbers: [],
            isValid: false,
            imageData: carton.imageData,
            isEditing: false,
            editText: '',
          });
        }
      }

      setOcrResults(cartonResults);
      setMode('ocr-results');
    } catch (err) {
      console.error('Erreur OCR:', err);
      setError('Erreur lors de l\'analyse. Essayez la saisie manuelle.');
      setMode('choose');
    }
  };

  // Éditer les numéros d'un carton
  const handleEditCarton = (index: number) => {
    setOcrResults((prev) =>
      prev.map((r, i) => ({
        ...r,
        isEditing: i === index,
        editText: r.numbers.join(' '),
      }))
    );
  };

  // Sauvegarder l'édition d'un carton
  const handleSaveCartonEdit = (index: number) => {
    const result = ocrResults[index];
    const numbers = parseNumbers(result.editText);
    const validation = validateCartonNumbers(numbers);

    setOcrResults((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              numbers,
              isValid: validation.valid,
              isEditing: false,
            }
          : r
      )
    );
  };

  // Mettre à jour le texte d'édition
  const handleEditTextChange = (index: number, text: string) => {
    setOcrResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editText: text } : r))
    );
  };

  // Confirmer tous les cartons OCR et créer la planche
  const handleConfirmOCR = () => {
    const validCartons: Carton[] = [];

    for (const result of ocrResults) {
      if (result.numbers.length === 15) {
        const carton = createCartonFromNumbers(result.numbers, validCartons.length);
        if (carton) {
          validCartons.push(carton);
        }
      }
    }

    if (validCartons.length === 0) {
      setError('Aucun carton valide. Corrigez les numéros ou passez en saisie manuelle.');
      return;
    }

    const planche: Planche = {
      id: uuidv4(),
      name: plancheName || `Planche ${new Date().toLocaleTimeString('fr-FR')}`,
      cartons: validCartons,
      imageUrl: capturedImage || undefined,
    };

    addPlanche(planche);
    router.push('/game');
  };

  // Parser les numéros entrés
  const parseNumbers = (input: string): number[] => {
    const nums = input
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 90);
    return [...new Set(nums)];
  };

  // Ajouter un carton manuellement
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
    setDetectedCartons([]);
    setOcrResults([]);
    setCartonNumbers('');
    setError('');
  };

  // Navigation entre cartons détectés
  const handlePrevCarton = () => {
    setSelectedCartonIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextCarton = () => {
    setSelectedCartonIndex((prev) => Math.min(ocrResults.length - 1, prev + 1));
  };

  // Mode choix
  if (mode === 'choose') {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center py-6">
          <h2 className="text-xl font-bold mb-2">Ajouter une planche</h2>
          <p className="text-[var(--muted-foreground)]">
            Scannez votre planche de 12 cartons
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
          {/* Prendre une photo de la planche */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 w-full p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">Scanner la planche A4</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Photo des 12 cartons en une fois
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

  // Mode détection en cours
  if (mode === 'detecting') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-[var(--muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Détection des cartons</h2>
          <div className="w-9" />
        </div>

        {capturedImage && (
          <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
            <img src={capturedImage} alt="Planche scannée" className="w-full" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Détection des 12 cartons...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode OCR en cours
  if (mode === 'ocr-processing') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-[var(--muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Lecture OCR</h2>
          <div className="w-9" />
        </div>

        <div className="space-y-4">
          {/* Grille des cartons détectés (2 colonnes comme la planche) */}
          <div className="grid grid-cols-2 gap-2">
            {detectedCartons.map((carton, i) => (
              <div
                key={i}
                className={cn(
                  'relative rounded-lg overflow-hidden border-2',
                  i < currentOcrCarton
                    ? 'border-green-500'
                    : i === currentOcrCarton
                    ? 'border-[var(--primary)] animate-pulse'
                    : 'border-[var(--border)]'
                )}
              >
                <img src={carton.imageData} alt={`Carton ${i + 1}`} className="w-full" />
                {i < currentOcrCarton && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                )}
                {i === currentOcrCarton && (
                  <div className="absolute inset-0 bg-[var(--primary)]/20 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Carton {ocrProgress.current + 1}/{ocrProgress.total}</span>
              <span>{Math.round(ocrProgress.percentage)}%</span>
            </div>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${ocrProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode résultats OCR
  if (mode === 'ocr-results') {
    const selectedResult = ocrResults[selectedCartonIndex];
    const validCount = ocrResults.filter((r) => r.isValid).length;

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-[var(--muted-foreground)]">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Vérification</h2>
          <button
            onClick={handleConfirmOCR}
            disabled={validCount === 0}
            className={cn(
              'p-2 -mr-2',
              validCount > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
            )}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>

        {/* Statistiques */}
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full">
            {validCount} valides
          </span>
          <span className="px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full">
            {ocrResults.length - validCount} à corriger
          </span>
        </div>

        {/* Navigation entre cartons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevCarton}
            disabled={selectedCartonIndex === 0}
            className="p-2 rounded-lg bg-[var(--muted)] disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 flex gap-1 justify-center">
            {ocrResults.map((r, i) => (
              <button
                key={i}
                onClick={() => setSelectedCartonIndex(i)}
                className={cn(
                  'w-6 h-6 rounded text-xs font-bold transition-all',
                  i === selectedCartonIndex
                    ? 'bg-[var(--primary)] text-white scale-110'
                    : r.isValid
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-orange-500/20 text-orange-600'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextCarton}
            disabled={selectedCartonIndex === ocrResults.length - 1}
            className="p-2 rounded-lg bg-[var(--muted)] disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Détail du carton sélectionné */}
        {selectedResult && (
          <div className="space-y-3">
            {/* Image du carton */}
            <div className="rounded-lg overflow-hidden border border-[var(--border)]">
              <img src={selectedResult.imageData} alt={`Carton ${selectedCartonIndex + 1}`} className="w-full" />
            </div>

            {/* Numéros détectés */}
            <div className={cn(
              'p-4 rounded-lg border',
              selectedResult.isValid
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-orange-500/5 border-orange-500/30'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Carton #{selectedCartonIndex + 1}</span>
                <span className={cn(
                  'text-sm px-2 py-0.5 rounded',
                  selectedResult.isValid
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-orange-500/20 text-orange-600'
                )}>
                  {selectedResult.numbers.length}/15 numéros
                </span>
              </div>

              {selectedResult.isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={selectedResult.editText}
                    onChange={(e) => handleEditTextChange(selectedCartonIndex, e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)] font-mono text-sm"
                    rows={2}
                    placeholder="Entrez les 15 numéros séparés par des espaces"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveCartonEdit(selectedCartonIndex)}
                      className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg font-medium text-sm"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => setOcrResults((prev) =>
                        prev.map((r, i) => (i === selectedCartonIndex ? { ...r, isEditing: false } : r))
                      )}
                      className="px-4 py-2 bg-[var(--muted)] rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedResult.numbers.length > 0 ? (
                      selectedResult.numbers.map((num) => (
                        <span
                          key={num}
                          className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-sm font-bold"
                        >
                          {num}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-sm">Aucun numéro détecté</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditCarton(selectedCartonIndex)}
                    className="w-full py-2 bg-[var(--muted)] rounded-lg text-sm font-medium"
                  >
                    Corriger les numéros
                  </button>
                </>
              )}
            </div>

            {!selectedResult.isValid && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Ce carton nécessite une correction. Il faut exactement 15 numéros entre 1 et 90.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirmOCR}
            disabled={validCount === 0}
            className={cn(
              'flex-1 py-3 rounded-lg font-medium',
              validCount > 0
                ? 'bg-green-500 text-white'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            )}
          >
            Confirmer {validCount} carton{validCount > 1 ? 's' : ''}
          </button>
          <button
            onClick={() => setMode('manual')}
            className="px-4 py-3 rounded-lg font-medium bg-[var(--muted)]"
          >
            Saisie manuelle
          </button>
        </div>
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
