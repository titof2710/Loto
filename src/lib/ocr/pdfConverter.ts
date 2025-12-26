'use client';

/**
 * Convertit un fichier PDF en image(s) haute résolution
 * Utilise PDF.js pour le rendu
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configurer le worker PDF.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface PDFPageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

/**
 * Convertit un fichier PDF en images (une par page)
 * @param file Le fichier PDF à convertir
 * @param scale Facteur d'échelle pour la résolution (2 = haute résolution)
 * @returns Un tableau d'images (data URL)
 */
export async function convertPDFToImages(
  file: File,
  scale: number = 2
): Promise<PDFPageImage[]> {
  // Lire le fichier comme ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Charger le document PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const images: PDFPageImage[] = [];

  // Convertir chaque page en image
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Obtenir les dimensions de la page
    const viewport = page.getViewport({ scale });

    // Créer un canvas pour le rendu
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Rendre la page sur le canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    // Convertir en data URL (PNG pour meilleure qualité)
    const imageData = canvas.toDataURL('image/png');

    images.push({
      pageNumber: pageNum,
      imageData,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return images;
}

/**
 * Convertit uniquement la première page d'un PDF en image
 * (Pour les planches de loto qui sont sur une seule page)
 */
export async function convertFirstPageToImage(
  file: File,
  scale: number = 2.5
): Promise<string> {
  const images = await convertPDFToImages(file, scale);

  if (images.length === 0) {
    throw new Error('Le PDF ne contient aucune page');
  }

  return images[0].imageData;
}

/**
 * Vérifie si un fichier est un PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
