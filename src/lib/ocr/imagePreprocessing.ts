/**
 * Prétraitement d'image pour améliorer l'OCR
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
 * Binarisation avec seuil adaptatif (Otsu simplifié)
 */
export function binarize(imageData: ImageData, threshold?: number): ImageData {
  const data = imageData.data;

  // Calculer le seuil automatiquement si non fourni
  if (threshold === undefined) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i];
      count++;
    }
    threshold = sum / count;
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
export function resizeCanvas(canvas: HTMLCanvasElement, maxWidth: number = 2000): HTMLCanvasElement {
  if (canvas.width <= maxWidth) return canvas;

  const ratio = maxWidth / canvas.width;
  const newCanvas = document.createElement('canvas');
  newCanvas.width = maxWidth;
  newCanvas.height = canvas.height * ratio;

  const ctx = newCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
  }

  return newCanvas;
}

/**
 * Prétraite une image pour l'OCR
 */
export async function preprocessImage(source: File | string): Promise<string> {
  const canvas = await loadImageToCanvas(source);
  const resized = resizeCanvas(canvas);

  const ctx = resized.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Appliquer les traitements
  let imageData = ctx.getImageData(0, 0, resized.width, resized.height);
  imageData = toGrayscale(imageData);
  imageData = increaseContrast(imageData, 1.3);
  imageData = binarize(imageData);

  ctx.putImageData(imageData, 0, 0);

  return resized.toDataURL('image/png');
}

/**
 * Découpe une image en grille (pour les planches de 12 cartons)
 * Disposition: 3 colonnes x 4 lignes ou 4 colonnes x 3 lignes
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
