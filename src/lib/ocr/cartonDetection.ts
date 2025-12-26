/**
 * Détection intelligente des cartons de loto sur une image
 * Approche simplifiée: découpage direct en grille 2x6 après détection de l'en-tête
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
 * Détecte le premier carton en cherchant le début des zones colorées/grilles
 * Les cartons ont des couleurs pastel (jaune, bleu, rose) ou sont blancs avec bordures noires
 */
function findFirstCartonY(
  imageData: ImageData,
  width: number,
  height: number,
  startX: number,
  endX: number
): number {
  const data = imageData.data;

  // Scanner de haut en bas pour trouver la première ligne avec une bordure noire horizontale significative
  // suivie d'une zone colorée (le premier carton)

  for (let y = 0; y < height * 0.3; y++) { // Chercher dans le premier 30%
    let darkPixelCount = 0;
    let totalPixels = 0;

    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      totalPixels++;
      if (brightness < 60) { // Pixel très sombre (bordure noire)
        darkPixelCount++;
      }
    }

    // Si on a une ligne avec beaucoup de pixels sombres (bordure supérieure du premier carton)
    const darkRatio = darkPixelCount / totalPixels;
    if (darkRatio > 0.3 && darkRatio < 0.8) {
      // Vérifier que la ligne suivante est plus claire (intérieur du carton)
      if (y + 5 < height) {
        let nextLineBrightness = 0;
        let count = 0;
        for (let x = startX; x < endX; x += 10) {
          const idx = ((y + 5) * width + x) * 4;
          nextLineBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
        if (nextLineBrightness / count > 150) {
          return y;
        }
      }
    }
  }

  return 0;
}

/**
 * Détecte la fin des cartons (dernière bordure noire avant l'arrière-plan)
 */
function findLastCartonY(
  imageData: ImageData,
  width: number,
  height: number,
  startX: number,
  endX: number
): number {
  const data = imageData.data;

  // Scanner de bas en haut pour trouver la dernière bordure noire
  for (let y = height - 1; y > height * 0.5; y--) {
    let darkPixelCount = 0;
    let totalPixels = 0;

    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;

      totalPixels++;
      if (brightness < 60) {
        darkPixelCount++;
      }
    }

    const darkRatio = darkPixelCount / totalPixels;
    if (darkRatio > 0.3 && darkRatio < 0.8) {
      // Vérifier que la ligne précédente est claire (intérieur du carton)
      if (y - 5 > 0) {
        let prevLineBrightness = 0;
        let count = 0;
        for (let x = startX; x < endX; x += 10) {
          const idx = ((y - 5) * width + x) * 4;
          prevLineBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
        if (prevLineBrightness / count > 150) {
          return y;
        }
      }
    }
  }

  return height;
}

/**
 * Détecte le rectangle principal de la planche (zone des 12 cartons uniquement)
 */
function detectPlancheBounds(
  imageData: ImageData,
  width: number,
  height: number
): BoundingBox {
  const data = imageData.data;

  // D'abord, trouver les limites horizontales (gauche/droite) de la zone claire
  let minX = width;
  let maxX = 0;

  const brightnessThreshold = 120;

  // Scanner le milieu de l'image pour trouver les bords gauche/droite
  const midY = Math.floor(height / 2);
  for (let x = 0; x < width; x++) {
    let brightCount = 0;
    // Vérifier plusieurs lignes autour du milieu
    for (let dy = -50; dy <= 50; dy += 10) {
      const y = Math.max(0, Math.min(height - 1, midY + dy));
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness > brightnessThreshold) {
        brightCount++;
      }
    }
    if (brightCount >= 5) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }

  // Marge de sécurité horizontale
  minX = Math.max(0, minX + 5);
  maxX = Math.min(width - 1, maxX - 5);

  // Maintenant trouver le début et la fin des cartons (ignorer l'en-tête et l'arrière-plan)
  const firstCartonY = findFirstCartonY(imageData, width, height, minX, maxX);
  const lastCartonY = findLastCartonY(imageData, width, height, minX, maxX);

  console.log(`Détection: firstY=${firstCartonY}, lastY=${lastCartonY}, minX=${minX}, maxX=${maxX}`);

  return {
    x: minX,
    y: firstCartonY,
    width: maxX - minX,
    height: lastCartonY - firstCartonY,
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
 * Trouve la première ligne horizontale noire (bordure supérieure des cartons)
 * en scannant de haut en bas
 */
function findFirstBlackLine(
  imageData: ImageData,
  width: number,
  height: number
): number {
  const data = imageData.data;

  for (let y = 0; y < height * 0.4; y++) {
    let blackCount = 0;
    let totalSampled = 0;

    // Échantillonner sur toute la largeur
    for (let x = Math.floor(width * 0.1); x < width * 0.9; x += 5) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalSampled++;
      // Pixel noir ou très sombre
      if (r < 50 && g < 50 && b < 50) {
        blackCount++;
      }
    }

    // Si plus de 50% de la ligne est noire, c'est une bordure
    if (totalSampled > 0 && blackCount / totalSampled > 0.5) {
      console.log(`Première ligne noire trouvée à y=${y}`);
      return y;
    }
  }

  // Par défaut, supposer que l'en-tête fait 10% de l'image
  return Math.floor(height * 0.1);
}

/**
 * Trouve la dernière ligne horizontale noire (bordure inférieure des cartons)
 * en scannant de bas en haut
 */
function findLastBlackLine(
  imageData: ImageData,
  width: number,
  height: number
): number {
  const data = imageData.data;

  for (let y = height - 1; y > height * 0.6; y--) {
    let blackCount = 0;
    let totalSampled = 0;

    for (let x = Math.floor(width * 0.1); x < width * 0.9; x += 5) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalSampled++;
      if (r < 50 && g < 50 && b < 50) {
        blackCount++;
      }
    }

    if (totalSampled > 0 && blackCount / totalSampled > 0.5) {
      console.log(`Dernière ligne noire trouvée à y=${y}`);
      return y;
    }
  }

  return height;
}

/**
 * Trouve la bordure verticale centrale (entre les 2 colonnes de cartons)
 */
function findCenterVerticalLine(
  imageData: ImageData,
  width: number,
  height: number,
  startY: number,
  endY: number
): number {
  const data = imageData.data;
  const centerX = Math.floor(width / 2);

  // Chercher autour du centre
  for (let offset = 0; offset < width * 0.1; offset++) {
    for (const x of [centerX + offset, centerX - offset]) {
      if (x < 0 || x >= width) continue;

      let blackCount = 0;
      let totalSampled = 0;

      for (let y = startY; y < endY; y += 5) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        totalSampled++;
        if (r < 50 && g < 50 && b < 50) {
          blackCount++;
        }
      }

      if (totalSampled > 0 && blackCount / totalSampled > 0.3) {
        console.log(`Ligne verticale centrale trouvée à x=${x}`);
        return x;
      }
    }
  }

  return centerX;
}

/**
 * Détecte les 12 cartons sur une planche de loto
 * Approche simplifiée: trouve les bordures puis découpe en grille 2x6
 */
export async function detectCartons(source: File | string): Promise<DetectedCarton[]> {
  const canvas = await loadImage(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width;
  const height = canvas.height;

  console.log(`Image: ${width}x${height}`);

  // 1. Trouver les bordures de la zone des cartons
  const topY = findFirstBlackLine(imageData, width, height);
  const bottomY = findLastBlackLine(imageData, width, height);
  const centerX = findCenterVerticalLine(imageData, width, height, topY, bottomY);

  console.log(`Zone cartons: topY=${topY}, bottomY=${bottomY}, centerX=${centerX}`);

  // 2. Calculer les dimensions
  const cartonsHeight = bottomY - topY;
  const cartonHeight = cartonsHeight / 6; // 6 lignes de cartons

  // Largeur: de la bordure gauche au centre, et du centre à la bordure droite
  // On suppose que les cartons occupent ~95% de la largeur
  const marginX = width * 0.02;
  const leftColStart = marginX;
  const leftColEnd = centerX - 2;
  const rightColStart = centerX + 2;
  const rightColEnd = width - marginX;

  const rectangles: BoundingBox[] = [];

  // 3. Créer la grille 2x6
  for (let row = 0; row < 6; row++) {
    const y = topY + row * cartonHeight;
    const h = cartonHeight;

    // Marges plus importantes pour éviter les bordures noires
    // et ne garder que la zone des numéros
    const marginY = h * 0.08; // 8% de marge verticale
    const marginXInner = (leftColEnd - leftColStart) * 0.03; // 3% de marge horizontale

    // Colonne gauche
    rectangles.push({
      x: leftColStart + marginXInner,
      y: y + marginY,
      width: leftColEnd - leftColStart - marginXInner * 2,
      height: h - marginY * 2,
    });

    // Colonne droite
    rectangles.push({
      x: rightColStart + marginXInner,
      y: y + marginY,
      width: rightColEnd - rightColStart - marginXInner * 2,
      height: h - marginY * 2,
    });
  }

  console.log(`${rectangles.length} cartons créés`);

  // 4. Extraire chaque carton comme image séparée
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
