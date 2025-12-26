/**
 * Prétraitement d'image pour améliorer l'OCR des cartons de loto
 */

/**
 * Convertit une image en niveaux de gris
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  return imageData;
}

/**
 * Augmente le contraste de l'image
 */
export function increaseContrast(imageData: ImageData, factor: number = 1.5): ImageData {
  const data = imageData.data;
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept));
  }
  return imageData;
}

/**
 * Ajuste la luminosité
 */
export function adjustBrightness(imageData: ImageData, adjustment: number): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + adjustment));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment));
  }
  return imageData;
}

/**
 * Binarisation avec seuil adaptatif (méthode Otsu)
 */
export function binarize(imageData: ImageData, threshold?: number): ImageData {
  const data = imageData.data;

  // Calculer le seuil avec la méthode d'Otsu si non fourni
  if (threshold === undefined) {
    threshold = calculateOtsuThreshold(imageData);
  }

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  return imageData;
}

/**
 * Calcule le seuil optimal avec la méthode d'Otsu
 */
function calculateOtsuThreshold(imageData: ImageData): number {
  const data = imageData.data;
  const histogram = new Array(256).fill(0);

  // Construire l'histogramme
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  const total = data.length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += i * histogram[i];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

/**
 * Applique une netteté à l'image (sharpen)
 */
export function sharpen(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const copy = new Uint8ClampedArray(data);

  // Kernel de netteté
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }

  return imageData;
}

/**
 * Dilatation morphologique pour épaissir les chiffres
 */
export function dilate(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Si un pixel voisin est noir, ce pixel devient noir
      let minVal = 255;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nIdx = ((y + ky) * width + (x + kx)) * 4;
          minVal = Math.min(minVal, copy[nIdx]);
        }
      }

      data[idx] = minVal;
      data[idx + 1] = minVal;
      data[idx + 2] = minVal;
    }
  }

  return imageData;
}

/**
 * Charge une image depuis un fichier ou URL et retourne un canvas
 */
export async function loadImageToCanvas(source: File | string): Promise<HTMLCanvasElement> {
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

/**
 * Redimensionne un canvas pour l'OCR (taille optimale)
 */
export function resizeCanvas(canvas: HTMLCanvasElement, maxWidth: number = 3000): HTMLCanvasElement {
  if (canvas.width <= maxWidth) return canvas;

  const ratio = maxWidth / canvas.width;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = maxWidth;
  newCanvas.height = canvas.height * ratio;

  const ctx = newCanvas.getContext('2d');
  if (ctx) {
    // Utiliser une meilleure interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
  }

  return newCanvas;
}

/**
 * Upscale l'image pour améliorer l'OCR (2x)
 */
export function upscaleCanvas(canvas: HTMLCanvasElement, factor: number = 2): HTMLCanvasElement {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width * factor;
  newCanvas.height = canvas.height * factor;

  const ctx = newCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
  }

  return newCanvas;
}

/**
 * Prétraite une image pour l'OCR (version améliorée)
 */
export async function preprocessImage(source: File | string): Promise<string> {
  const canvas = await loadImageToCanvas(source);

  // Upscale si l'image est petite
  let processed = canvas.width < 1500 ? upscaleCanvas(canvas, 2) : canvas;

  // Limiter la taille max
  processed = resizeCanvas(processed, 4000);

  const ctx = processed.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Appliquer les traitements
  let imageData = ctx.getImageData(0, 0, processed.width, processed.height);
  imageData = toGrayscale(imageData);
  imageData = increaseContrast(imageData, 1.5);
  imageData = sharpen(imageData);
  imageData = binarize(imageData);

  ctx.putImageData(imageData, 0, 0);

  return processed.toDataURL('image/png');
}

/**
 * Prétraite une image de carton individuel (plus agressif)
 */
export async function preprocessCartonImage(source: File | string): Promise<string> {
  const canvas = await loadImageToCanvas(source);

  // Upscale pour améliorer la reconnaissance
  let processed = upscaleCanvas(canvas, 3);

  const ctx = processed.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Traitements plus agressifs pour un seul carton
  let imageData = ctx.getImageData(0, 0, processed.width, processed.height);
  imageData = toGrayscale(imageData);
  imageData = adjustBrightness(imageData, 20);
  imageData = increaseContrast(imageData, 2.0);
  imageData = sharpen(imageData);
  imageData = binarize(imageData);
  imageData = dilate(imageData); // Épaissir les chiffres

  ctx.putImageData(imageData, 0, 0);

  return processed.toDataURL('image/png');
}

export interface DetectedCarton {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
}

/**
 * Détecte automatiquement les bordures des cartons sur une planche
 * Utilise la détection de lignes horizontales et verticales
 */
export async function detectCartonBorders(
  source: File | string
): Promise<DetectedCarton[]> {
  const canvas = await loadImageToCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Convertir en niveaux de gris et binariser pour détecter les lignes
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  imageData = toGrayscale(imageData);
  imageData = binarize(imageData);

  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Détecter les lignes horizontales (chercher des séquences de pixels noirs)
  const horizontalLines: number[] = [];
  const minLineLength = width * 0.5; // Une ligne doit faire au moins 50% de la largeur

  for (let y = 0; y < height; y++) {
    let blackCount = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 128) {
        blackCount++;
      }
    }
    if (blackCount > minLineLength) {
      // Éviter les lignes trop proches
      if (horizontalLines.length === 0 || y - horizontalLines[horizontalLines.length - 1] > 20) {
        horizontalLines.push(y);
      }
    }
  }

  // Détecter les lignes verticales
  const verticalLines: number[] = [];
  const minVertLineLength = height * 0.3;

  for (let x = 0; x < width; x++) {
    let blackCount = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 128) {
        blackCount++;
      }
    }
    if (blackCount > minVertLineLength) {
      if (verticalLines.length === 0 || x - verticalLines[verticalLines.length - 1] > 20) {
        verticalLines.push(x);
      }
    }
  }

  // Si on n'a pas détecté assez de lignes, utiliser la grille par défaut
  if (horizontalLines.length < 3 || verticalLines.length < 2) {
    return splitIntoGridDefault(source);
  }

  // Extraire les cartons à partir des intersections
  const cartons: DetectedCarton[] = [];

  for (let row = 0; row < horizontalLines.length - 1; row++) {
    for (let col = 0; col < verticalLines.length - 1; col++) {
      const x = verticalLines[col];
      const y = horizontalLines[row];
      const w = verticalLines[col + 1] - x;
      const h = horizontalLines[row + 1] - y;

      // Vérifier que la zone a une taille raisonnable
      if (w > 50 && h > 30) {
        const cellCanvas = document.createElement('canvas');
        cellCanvas.width = w;
        cellCanvas.height = h;

        const cellCtx = cellCanvas.getContext('2d');
        if (cellCtx) {
          cellCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

          cartons.push({
            index: cartons.length,
            x,
            y,
            width: w,
            height: h,
            imageData: cellCanvas.toDataURL('image/png')
          });
        }
      }
    }
  }

  // Si on a trouvé des cartons, les retourner
  if (cartons.length >= 6) {
    return cartons.slice(0, 12); // Maximum 12 cartons
  }

  // Sinon, utiliser la grille par défaut
  return splitIntoGridDefault(source);
}

/**
 * Découpe une image en grille par défaut (3 colonnes x 4 lignes)
 */
async function splitIntoGridDefault(source: File | string): Promise<DetectedCarton[]> {
  const canvas = await loadImageToCanvas(source);

  // Disposition standard: 2 colonnes x 6 lignes ou 3 colonnes x 4 lignes
  // On va essayer de détecter le ratio pour choisir
  const ratio = canvas.width / canvas.height;

  let cols: number, rows: number;
  if (ratio > 1.2) {
    // Paysage: 3 colonnes x 4 lignes
    cols = 3;
    rows = 4;
  } else if (ratio < 0.8) {
    // Portrait: 2 colonnes x 6 lignes
    cols = 2;
    rows = 6;
  } else {
    // Carré: 3 colonnes x 4 lignes
    cols = 3;
    rows = 4;
  }

  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  const cartons: DetectedCarton[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = cellWidth;
      cellCanvas.height = cellHeight;

      const ctx = cellCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, x, y, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);

        cartons.push({
          index: cartons.length,
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          imageData: cellCanvas.toDataURL('image/png')
        });
      }
    }
  }

  return cartons;
}

/**
 * Découpe une image en grille (pour les planches de 12 cartons)
 * @deprecated Utiliser detectCartonBorders à la place
 */
export async function splitIntoGrid(
  source: File | string,
  cols: number = 3,
  rows: number = 4
): Promise<string[]> {
  const canvas = await loadImageToCanvas(source);
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  const cells: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = cellWidth;
      cellCanvas.height = cellHeight;

      const ctx = cellCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
          0,
          0,
          cellWidth,
          cellHeight
        );
        cells.push(cellCanvas.toDataURL('image/png'));
      }
    }
  }

  return cells;
}
