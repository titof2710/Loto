/**
 * Détection intelligente des cartons de loto sur une image
 * Fonctionne en couleur et en noir & blanc
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedCarton {
  index: number;
  bounds: BoundingBox;
  imageData: string;
}

/**
 * Charge une image et retourne un canvas
 */
export async function loadImage(source: File | string): Promise<HTMLCanvasElement> {
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
 * Convertit en niveaux de gris
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  const data = imageData.data;

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }

  return gray;
}

/**
 * Détection de contours avec Sobel
 */
function sobelEdgeDetection(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height);

  // Kernels Sobel
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kidx];
          gy += gray[idx] * sobelY[kidx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(255, magnitude);
    }
  }

  return edges;
}

/**
 * Binarisation avec seuil
 */
function binarize(data: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const binary = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    binary[i] = data[i] > threshold ? 255 : 0;
  }
  return binary;
}

/**
 * Trouve les lignes horizontales fortes (bordures de cartons)
 */
function findHorizontalLines(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  minLength: number
): number[] {
  const lines: number[] = [];
  const minWhitePixels = minLength * 0.6;

  for (let y = 0; y < height; y++) {
    let whiteCount = 0;
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] > 128) {
        whiteCount++;
      }
    }

    if (whiteCount >= minWhitePixels) {
      // Éviter les lignes trop proches (au moins 20px d'écart)
      if (lines.length === 0 || y - lines[lines.length - 1] > 20) {
        lines.push(y);
      }
    }
  }

  return lines;
}

/**
 * Trouve les lignes verticales fortes
 */
function findVerticalLines(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  minLength: number
): number[] {
  const lines: number[] = [];
  const minWhitePixels = minLength * 0.5;

  for (let x = 0; x < width; x++) {
    let whiteCount = 0;
    for (let y = 0; y < height; y++) {
      if (binary[y * width + x] > 128) {
        whiteCount++;
      }
    }

    if (whiteCount >= minWhitePixels) {
      if (lines.length === 0 || x - lines[lines.length - 1] > 20) {
        lines.push(x);
      }
    }
  }

  return lines;
}

/**
 * Filtre les rectangles qui ont le bon ratio pour être des cartons
 * Un carton de loto a un ratio largeur/hauteur d'environ 2.5 à 4
 */
function filterCartonRectangles(
  horizontalLines: number[],
  verticalLines: number[],
  imageWidth: number,
  imageHeight: number
): BoundingBox[] {
  const rectangles: BoundingBox[] = [];

  // Ratio attendu pour un carton (largeur / hauteur)
  const minRatio = 1.8;
  const maxRatio = 4.5;

  // Taille minimale attendue (au moins 5% de l'image)
  const minWidth = imageWidth * 0.15;
  const minHeight = imageHeight * 0.05;

  for (let i = 0; i < horizontalLines.length - 1; i++) {
    for (let j = 0; j < verticalLines.length - 1; j++) {
      const x = verticalLines[j];
      const y = horizontalLines[i];
      const w = verticalLines[j + 1] - x;
      const h = horizontalLines[i + 1] - y;

      if (w < minWidth || h < minHeight) continue;

      const ratio = w / h;
      if (ratio >= minRatio && ratio <= maxRatio) {
        rectangles.push({ x, y, width: w, height: h });
      }
    }
  }

  return rectangles;
}

/**
 * Groupe les rectangles similaires et supprime les doublons
 */
function deduplicateRectangles(rectangles: BoundingBox[], tolerance: number = 30): BoundingBox[] {
  if (rectangles.length === 0) return [];

  const result: BoundingBox[] = [];

  for (const rect of rectangles) {
    let isDuplicate = false;

    for (const existing of result) {
      if (
        Math.abs(rect.x - existing.x) < tolerance &&
        Math.abs(rect.y - existing.y) < tolerance &&
        Math.abs(rect.width - existing.width) < tolerance &&
        Math.abs(rect.height - existing.height) < tolerance
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      result.push(rect);
    }
  }

  return result;
}

/**
 * Trie les cartons par position (haut en bas, gauche à droite)
 * Pour une disposition 2 colonnes x 6 lignes
 */
function sortCartonsByPosition(rectangles: BoundingBox[]): BoundingBox[] {
  return rectangles.sort((a, b) => {
    // D'abord par ligne (Y), avec une tolérance pour les cartons sur la même ligne
    const rowTolerance = 50;
    const rowDiff = Math.floor(a.y / rowTolerance) - Math.floor(b.y / rowTolerance);

    if (rowDiff !== 0) return rowDiff;

    // Ensuite par colonne (X)
    return a.x - b.x;
  });
}

/**
 * Si la détection automatique échoue, on utilise une grille fixe
 * basée sur le format standard des planches LOTOQUINE
 */
function fallbackGridDetection(
  canvas: HTMLCanvasElement,
  headerHeight: number = 0.05 // 5% pour l'en-tête
): BoundingBox[] {
  const width = canvas.width;
  const height = canvas.height;

  // Ignorer l'en-tête (environ 5% en haut)
  const startY = height * headerHeight;
  const contentHeight = height - startY;

  // 2 colonnes, 6 lignes
  const cols = 2;
  const rows = 6;

  const cellWidth = width / cols;
  const cellHeight = contentHeight / rows;

  const rectangles: BoundingBox[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Ajouter une petite marge pour éviter les bordures
      const margin = 5;
      rectangles.push({
        x: col * cellWidth + margin,
        y: startY + row * cellHeight + margin,
        width: cellWidth - margin * 2,
        height: cellHeight - margin * 2,
      });
    }
  }

  return rectangles;
}

/**
 * Extrait une zone de l'image en tant que canvas séparé
 */
function extractRegion(
  sourceCanvas: HTMLCanvasElement,
  bounds: BoundingBox
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );
  }

  return canvas;
}

/**
 * Détecte les 12 cartons sur une planche de loto
 */
export async function detectCartons(source: File | string): Promise<DetectedCarton[]> {
  const canvas = await loadImage(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width;
  const height = canvas.height;

  // Convertir en niveaux de gris et détecter les contours
  const gray = toGrayscale(imageData);
  const edges = sobelEdgeDetection(gray, width, height);
  const binary = binarize(edges, 50);

  // Trouver les lignes horizontales et verticales
  const horizontalLines = findHorizontalLines(binary, width, height, width * 0.3);
  const verticalLines = findVerticalLines(binary, width, height, height * 0.3);

  console.log(`Détecté ${horizontalLines.length} lignes horizontales, ${verticalLines.length} verticales`);

  // Trouver les rectangles de cartons
  let rectangles = filterCartonRectangles(horizontalLines, verticalLines, width, height);
  rectangles = deduplicateRectangles(rectangles);
  rectangles = sortCartonsByPosition(rectangles);

  console.log(`Détecté ${rectangles.length} cartons potentiels`);

  // Si on n'a pas trouvé entre 10 et 14 cartons, utiliser la grille de secours
  if (rectangles.length < 10 || rectangles.length > 14) {
    console.log('Utilisation de la détection par grille fixe');
    rectangles = fallbackGridDetection(canvas);
  }

  // Limiter à 12 cartons max
  rectangles = rectangles.slice(0, 12);

  // Extraire chaque carton comme image séparée
  const cartons: DetectedCarton[] = rectangles.map((bounds, index) => {
    const cartonCanvas = extractRegion(canvas, bounds);
    return {
      index,
      bounds,
      imageData: cartonCanvas.toDataURL('image/png'),
    };
  });

  return cartons;
}

/**
 * Prétraite l'image d'un carton pour l'OCR
 */
export function preprocessCartonForOCR(cartonCanvas: HTMLCanvasElement): string {
  const ctx = cartonCanvas.getContext('2d');
  if (!ctx) return cartonCanvas.toDataURL('image/png');

  // Upscale x2 pour meilleure reconnaissance
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = cartonCanvas.width * 2;
  scaledCanvas.height = cartonCanvas.height * 2;

  const scaledCtx = scaledCanvas.getContext('2d');
  if (!scaledCtx) return cartonCanvas.toDataURL('image/png');

  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'high';
  scaledCtx.drawImage(cartonCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  // Augmenter le contraste
  const imageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Convertir en gris
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    // Augmenter le contraste (factor 1.5)
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.5 + 128));

    // Binariser (seuil adaptatif)
    const binary = contrasted > 140 ? 255 : 0;

    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }

  scaledCtx.putImageData(imageData, 0, 0);

  return scaledCanvas.toDataURL('image/png');
}
