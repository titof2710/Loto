'use client';

import { useState, useCallback } from 'react';
import { extractNumbersFromImage, validateCartonNumbers, type OCRResult } from '@/lib/ocr/tesseractOCR';
import { preprocessImage } from '@/lib/ocr/imagePreprocessing';

interface UseOCRResult {
  isProcessing: boolean;
  progress: number;
  result: OCRResult | null;
  error: string | null;
  processImage: (image: File | string) => Promise<OCRResult | null>;
  reset: () => void;
}

export function useOCR(): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (image: File | string): Promise<OCRResult | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Prétraiter l'image
      setProgress(0.1);
      const preprocessedImage = await preprocessImage(image);

      // OCR
      const ocrResult = await extractNumbersFromImage(preprocessedImage, (p) => {
        setProgress(0.1 + p * 0.9);
      });

      // Valider les résultats
      const validation = validateCartonNumbers(ocrResult.numbers);

      if (!validation.valid) {
        setError(`Validation: ${validation.errors.join(', ')}`);
      }

      setResult(ocrResult);
      setProgress(1);
      return ocrResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur OCR inconnue';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    progress,
    result,
    error,
    processImage,
    reset,
  };
}
