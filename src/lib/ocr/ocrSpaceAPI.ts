'use client';

/**
 * OCR via OCR.space API (gratuit)
 * Engine 2 est optimisé pour la reconnaissance de chiffres
 *
 * Limites gratuites:
 * - 500 requêtes/jour par IP
 * - 1 MB max par fichier
 * - 3 pages max pour les PDFs
 */

export interface OCRSpaceResult {
  numbers: number[];
  confidence: number;
  rawText: string;
  serialNumber?: string; // Numéro de série du carton (ex: "30-0054")
}

// Clé API gratuite personnelle
const FREE_API_KEY = 'K82030734288957';

/**
 * Extrait les numéros d'une image via OCR.space API
 * Utilise Engine 2 qui est meilleur pour les chiffres
 */
export async function extractNumbersWithOCRSpace(
  imageSource: string | File,
  onProgress?: (progress: number) => void,
  usePreprocessing: boolean = true
): Promise<OCRSpaceResult> {
  try {
    onProgress?.(0.1);

    // Pré-traiter l'image pour améliorer l'OCR
    let base64Image: string;

    if (usePreprocessing) {
      base64Image = await preprocessImage(imageSource);
    } else if (imageSource instanceof File) {
      base64Image = await fileToBase64(imageSource);
    } else if (imageSource.startsWith('data:')) {
      base64Image = imageSource;
    } else {
      // URL - on doit la convertir en base64
      base64Image = await urlToBase64(imageSource);
    }

    onProgress?.(0.3);

    // Préparer les données pour l'API
    const formData = new FormData();
    formData.append('base64Image', base64Image);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Engine 2 est meilleur pour les chiffres
    formData.append('scale', 'true'); // Améliore la reconnaissance
    formData.append('isTable', 'true'); // Indique que c'est un tableau

    onProgress?.(0.5);

    // Appel à l'API OCR.space
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': FREE_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }

    const result = await response.json();

    onProgress?.(0.8);

    // Vérifier les erreurs
    if (result.IsErroredOnProcessing) {
      console.error('OCR.space error:', result.ErrorMessage);
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
    }

    // Extraire le texte
    const rawText = result.ParsedResults?.[0]?.ParsedText || '';
    console.log('OCR.space raw text:', rawText);

    // Extraire le numéro de série (format XX-XXXX comme "30-0054")
    const serialNumber = extractSerialNumber(rawText);
    if (serialNumber) {
      console.log('Numéro de série détecté:', serialNumber);
    }

    // Extraire les numéros de loto (1-90) en excluant le numéro de série
    const numbers = extractLotoNumbers(rawText, serialNumber);

    onProgress?.(1);

    return {
      numbers: numbers.sort((a, b) => a - b),
      confidence: numbers.length === 15 ? 95 : (numbers.length / 15) * 100,
      rawText,
      serialNumber,
    };
  } catch (error) {
    console.error('OCR.space error:', error);
    return {
      numbers: [],
      confidence: 0,
      rawText: '',
    };
  }
}

/**
 * Extrait le numéro de série du carton (format XX-XXXX comme "30-0054")
 */
function extractSerialNumber(text: string): string | undefined {
  // Chercher un pattern comme "30-0054" ou "30-0552"
  const serialMatch = text.match(/(\d{2})-?(\d{4})/);
  if (serialMatch) {
    return `${serialMatch[1]}-${serialMatch[2]}`;
  }
  return undefined;
}

/**
 * Extrait les numéros de loto (1-90) d'un texte OCR
 * Filtre le numéro de série et le texte "LOTOQUINE"
 */
function extractLotoNumbers(text: string, serialNumber?: string): number[] {
  // Supprimer le numéro de série du texte pour éviter les faux positifs
  let cleanedText = text;
  if (serialNumber) {
    // Supprimer le numéro de série sous toutes ses formes
    cleanedText = cleanedText.replace(new RegExp(serialNumber.replace('-', '[-]?'), 'g'), ' ');
  }

  // Supprimer "LOTOQUINE" et variations
  cleanedText = cleanedText
    .replace(/L\s*O\s*T\s*O\s*Q\s*U\s*I\s*N\s*E/gi, ' ')
    .replace(/LOTOQUINE/gi, ' ')
    .replace(/LOTOOUINE/gi, ' ')
    .replace(/I\s*OTOOLINE/gi, ' ')
    .replace(/I\s*OTOQUINE/gi, ' ');

  // Nettoyer le texte - NE PAS remplacer les lettres par des chiffres
  // car cela cause des faux positifs (le "O" de LOTOQUINE devient "0")
  const cleaned = cleanedText
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\d\s]/g, ' ');  // Garder seulement les chiffres et espaces

  // Trouver tous les nombres (1 ou 2 chiffres)
  const matches = cleaned.match(/\b(\d{1,2})\b/g);

  if (!matches) return [];

  const numbers: number[] = [];

  for (const match of matches) {
    const num = parseInt(match, 10);
    // Valider que c'est un numéro de loto valide (1-90)
    if (num >= 1 && num <= 90 && !numbers.includes(num)) {
      numbers.push(num);
    }
  }

  return numbers;
}

/**
 * Convertit un File en base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convertit une URL (ou data URL) en base64
 */
async function urlToBase64(url: string): Promise<string> {
  // Si c'est déjà une data URL, la retourner
  if (url.startsWith('data:')) {
    return url;
  }

  // Charger l'image et la convertir
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Pré-traitement d'une image pour améliorer l'OCR
 * - Augmente le contraste (sans binarisation pour garder les détails)
 * - Agrandit l'image pour une meilleure reconnaissance
 */
async function preprocessImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Agrandir l'image 2x pour une meilleure OCR
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Dessiner l'image agrandie avec un fond blanc
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Augmenter le contraste sans binariser (garde les nuances)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Augmenter le contraste: étirer l'histogramme
      const contrast = 1.5; // Facteur de contraste
      const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

      for (let i = 0; i < data.length; i += 4) {
        // Appliquer le contraste
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));

    if (imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Traite un carton individuel avec OCR.space
 * Essaie plusieurs approches pour maximiser la reconnaissance
 */
export async function extractNumbersFromCartonOCRSpace(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRSpaceResult> {
  try {
    // 1. D'abord essayer l'OCR avec pré-traitement sur l'image entière
    console.log('OCR.space: Essai 1 - image entière avec pré-traitement');
    const result1 = await extractNumbersWithOCRSpace(imageSource, (p) => onProgress?.(p * 0.3), true);
    console.log(`Essai 1: ${result1.numbers.length} numéros trouvés:`, result1.numbers);

    // Si on a trouvé 15 numéros, parfait
    if (result1.numbers.length >= 15) {
      return result1;
    }

    // 2. Essayer sans pré-traitement si on n'a pas assez
    if (result1.numbers.length < 12) {
      console.log('OCR.space: Essai 2 - image entière sans pré-traitement');
      const result2 = await extractNumbersWithOCRSpace(imageSource, (p) => onProgress?.(0.3 + p * 0.2), false);
      console.log(`Essai 2: ${result2.numbers.length} numéros trouvés:`, result2.numbers);

      // Fusionner les résultats
      const mergedNumbers = [...result1.numbers];
      for (const num of result2.numbers) {
        if (!mergedNumbers.includes(num)) {
          mergedNumbers.push(num);
        }
      }

      if (mergedNumbers.length >= 15) {
        return {
          numbers: mergedNumbers.sort((a, b) => a - b).slice(0, 15),
          confidence: 95,
          rawText: result1.rawText + ' | ' + result2.rawText,
          serialNumber: result1.serialNumber || result2.serialNumber,
        };
      }

      // Continuer avec le meilleur résultat
      if (mergedNumbers.length > result1.numbers.length) {
        result1.numbers = mergedNumbers;
      }
    }

    // 3. Si toujours pas assez, essayer cellule par cellule
    if (result1.numbers.length < 12) {
      console.log('OCR.space: Essai 3 - cellule par cellule');

      const canvas = await loadImageToCanvas(imageSource);
      const width = canvas.width;
      const height = canvas.height;

      const cellWidth = width / 9;
      const cellHeight = height / 3;

      const numbers = [...result1.numbers];
      let processedCells = 0;
      const totalCells = 27;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
          // Extraire la cellule avec une marge
          const margin = 2;
          const cellCanvas = document.createElement('canvas');
          const cw = Math.floor(cellWidth) + margin * 2;
          const ch = Math.floor(cellHeight) + margin * 2;
          cellCanvas.width = cw;
          cellCanvas.height = ch;

          const cellCtx = cellCanvas.getContext('2d');
          if (!cellCtx) continue;

          // Fond blanc
          cellCtx.fillStyle = 'white';
          cellCtx.fillRect(0, 0, cw, ch);

          // Copier la cellule
          const srcX = Math.max(0, col * cellWidth - margin);
          const srcY = Math.max(0, row * cellHeight - margin);
          const srcW = Math.min(cellWidth + margin * 2, width - srcX);
          const srcH = Math.min(cellHeight + margin * 2, height - srcY);

          cellCtx.drawImage(
            canvas,
            srcX, srcY, srcW, srcH,
            0, 0, cw, ch
          );

          // Vérifier si la cellule a du contenu
          const imageData = cellCtx.getImageData(0, 0, cw, ch);
          if (checkCellHasContent(imageData)) {
            // OCR sur cette cellule (sans pré-traitement car déjà petite)
            const cellResult = await extractNumbersWithOCRSpace(
              cellCanvas.toDataURL('image/png'),
              undefined,
              false
            );

            for (const num of cellResult.numbers) {
              if (!numbers.includes(num) && numbers.length < 15) {
                numbers.push(num);
                console.log(`Cellule [${row},${col}]: trouvé ${num}`);
              }
            }
          }

          processedCells++;
          onProgress?.(0.5 + (processedCells / totalCells) * 0.5);
        }
      }

      return {
        numbers: numbers.sort((a, b) => a - b),
        confidence: numbers.length === 15 ? 95 : (numbers.length / 15) * 100,
        rawText: result1.rawText,
        serialNumber: result1.serialNumber,
      };
    }

    return result1;
  } catch (error) {
    console.error('OCR.space carton error:', error);
    return {
      numbers: [],
      confidence: 0,
      rawText: '',
    };
  }
}

/**
 * Vérifie si une cellule contient du contenu
 */
function checkCellHasContent(imageData: ImageData): boolean {
  const data = imageData.data;
  let darkPixels = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness < 100) {
      darkPixels++;
    }
  }

  return darkPixels / total > 0.02;
}

/**
 * Charge une image en canvas
 */
async function loadImageToCanvas(source: File | string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
}
