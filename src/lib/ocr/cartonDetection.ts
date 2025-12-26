/**
 * Détection intelligente des cartons de loto sur une image
 * Basée sur la détection du rectangle de la planche puis découpage en grille
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
 * Détecte le rectangle principal de la planche (la zone colorée/blanche)
 * en cherchant la plus grande zone non-sombre de l'image
 */
function detectPlancheBounds(
  imageData: ImageData,
  width: number,
  height: number
): BoundingBox {
  const data = imageData.data;

  // Trouver les limites de la zone "claire" (la planche)
  // On cherche les pixels qui ne sont pas trop sombres (pas l'arrière-plan)
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  // Seuil pour considérer un pixel comme "clair" (partie de la planche)
  const brightnessThreshold = 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Calculer la luminosité
      const brightness = (r + g + b) / 3;

      // Si le pixel est assez clair, il fait partie de la planche
      if (brightness > brightnessThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Ajouter une petite marge
  const margin = 5;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Analyse l'histogramme horizontal pour trouver les lignes de séparation
 * (les bordures noires entre les cartons)
 */
function findHorizontalSeparators(
  imageData: ImageData,
  bounds: BoundingBox,
  width: number
): number[] {
  const data = imageData.data;
  const separators: number[] = [];

  // Scanner chaque ligne horizontale dans la zone de la planche
  const darkThreshold = 80; // Seuil pour considérer un pixel comme "sombre"
  const minDarkRatio = 0.4; // Au moins 40% de pixels sombres pour être une séparation

  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    let darkCount = 0;
    let totalCount = 0;

    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      totalCount++;
      if (brightness < darkThreshold) {
        darkCount++;
      }
    }

    const darkRatio = darkCount / totalCount;
    if (darkRatio > minDarkRatio) {
      // Éviter les lignes trop proches (fusionner)
      if (separators.length === 0 || y - separators[separators.length - 1] > 10) {
        separators.push(y);
      }
    }
  }

  return separators;
}

/**
 * Analyse l'histogramme vertical pour trouver les colonnes de séparation
 */
function findVerticalSeparators(
  imageData: ImageData,
  bounds: BoundingBox,
  width: number,
  height: number
): number[] {
  const data = imageData.data;
  const separators: number[] = [];

  const darkThreshold = 80;
  const minDarkRatio = 0.3;

  for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
    let darkCount = 0;
    let totalCount = 0;

    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      totalCount++;
      if (brightness < darkThreshold) {
        darkCount++;
      }
    }

    const darkRatio = darkCount / totalCount;
    if (darkRatio > minDarkRatio) {
      if (separators.length === 0 || x - separators[separators.length - 1] > 10) {
        separators.push(x);
      }
    }
  }

  return separators;
}

/**
 * Regroupe les séparateurs proches et trouve les vraies frontières
 */
function clusterSeparators(separators: number[], minGap: number): number[] {
  if (separators.length === 0) return [];

  const clusters: number[][] = [];
  let currentCluster: number[] = [separators[0]];

  for (let i = 1; i < separators.length; i++) {
    if (separators[i] - separators[i - 1] < minGap) {
      currentCluster.push(separators[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [separators[i]];
    }
  }
  clusters.push(currentCluster);

  // Retourner le centre de chaque cluster
  return clusters.map(cluster =>
    Math.round(cluster.reduce((a, b) => a + b, 0) / cluster.length)
  );
}

/**
 * Découpe la planche en grille de 2x6 cartons
 */
function splitPlancheIntoGrid(
  canvas: HTMLCanvasElement,
  bounds: BoundingBox
): BoundingBox[] {
  const cols = 2;
  const rows = 6;

  const cellWidth = bounds.width / cols;
  const cellHeight = bounds.height / rows;

  const rectangles: BoundingBox[] = [];

  // Marge intérieure pour éviter les bordures noires
  const marginX = cellWidth * 0.02;
  const marginY = cellHeight * 0.02;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rectangles.push({
        x: bounds.x + col * cellWidth + marginX,
        y: bounds.y + row * cellHeight + marginY,
        width: cellWidth - marginX * 2,
        height: cellHeight - marginY * 2,
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
  canvas.width = Math.round(bounds.width);
  canvas.height = Math.round(bounds.height);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      sourceCanvas,
      Math.round(bounds.x),
      Math.round(bounds.y),
      Math.round(bounds.width),
      Math.round(bounds.height),
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  return canvas;
}

/**
 * Améliore la détection en utilisant les bordures noires des cartons
 */
function refineGridWithBorders(
  imageData: ImageData,
  bounds: BoundingBox,
  width: number,
  height: number
): BoundingBox[] {
  // Trouver les séparateurs horizontaux (lignes noires entre les cartons)
  const hSeparators = findHorizontalSeparators(imageData, bounds, width);
  const vSeparators = findVerticalSeparators(imageData, bounds, width, height);

  console.log(`Séparateurs H: ${hSeparators.length}, V: ${vSeparators.length}`);

  // Regrouper les séparateurs proches
  const hClusters = clusterSeparators(hSeparators, bounds.height * 0.05);
  const vClusters = clusterSeparators(vSeparators, bounds.width * 0.05);

  console.log(`Clusters H: ${hClusters.length}, V: ${vClusters.length}`);

  // On s'attend à 7 lignes horizontales (haut + 6 séparations) et 3 verticales (gauche + milieu + droite)
  // Si on n'a pas le bon nombre, on utilise la grille par défaut

  if (hClusters.length >= 5 && vClusters.length >= 2) {
    // Utiliser les séparateurs détectés
    const rectangles: BoundingBox[] = [];

    // Trier les clusters
    hClusters.sort((a, b) => a - b);
    vClusters.sort((a, b) => a - b);

    // S'assurer qu'on a les bords
    if (hClusters[0] > bounds.y + 20) {
      hClusters.unshift(bounds.y);
    }
    if (hClusters[hClusters.length - 1] < bounds.y + bounds.height - 20) {
      hClusters.push(bounds.y + bounds.height);
    }
    if (vClusters[0] > bounds.x + 20) {
      vClusters.unshift(bounds.x);
    }
    if (vClusters[vClusters.length - 1] < bounds.x + bounds.width - 20) {
      vClusters.push(bounds.x + bounds.width);
    }

    // Créer les rectangles à partir des intersections
    for (let row = 0; row < Math.min(hClusters.length - 1, 6); row++) {
      for (let col = 0; col < Math.min(vClusters.length - 1, 2); col++) {
        const x = vClusters[col];
        const y = hClusters[row];
        const w = vClusters[col + 1] - x;
        const h = hClusters[row + 1] - y;

        // Marge pour éviter les bordures
        const margin = 3;
        rectangles.push({
          x: x + margin,
          y: y + margin,
          width: w - margin * 2,
          height: h - margin * 2,
        });
      }
    }

    if (rectangles.length >= 10) {
      return rectangles.slice(0, 12);
    }
  }

  // Fallback: grille régulière
  return splitPlancheIntoGrid({ width, height } as HTMLCanvasElement, bounds);
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

  // 1. Détecter les limites de la planche (ignorer l'arrière-plan sombre)
  const plancheBounds = detectPlancheBounds(imageData, width, height);

  console.log(`Planche détectée: x=${plancheBounds.x}, y=${plancheBounds.y}, w=${plancheBounds.width}, h=${plancheBounds.height}`);

  // Vérifier que la planche détectée est raisonnable
  if (plancheBounds.width < width * 0.3 || plancheBounds.height < height * 0.3) {
    console.log('Planche trop petite, utilisation de l\'image entière');
    plancheBounds.x = 0;
    plancheBounds.y = 0;
    plancheBounds.width = width;
    plancheBounds.height = height;
  }

  // 2. Essayer de détecter les bordures noires des cartons
  let rectangles = refineGridWithBorders(imageData, plancheBounds, width, height);

  // 3. Si pas assez de rectangles, utiliser la grille par défaut
  if (rectangles.length < 12) {
    console.log('Utilisation de la grille par défaut 2x6');
    rectangles = splitPlancheIntoGrid(canvas, plancheBounds);
  }

  // Limiter à 12 cartons
  rectangles = rectangles.slice(0, 12);

  console.log(`${rectangles.length} cartons détectés`);

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
