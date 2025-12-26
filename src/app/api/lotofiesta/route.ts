import { NextResponse } from 'next/server';
import type { LotoTirage } from '@/types';

// Cache des tirages (1 heure)
let cachedTirages: LotoTirage[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure

/**
 * GET /api/lotofiesta
 * Récupère la liste des tirages depuis lotofiesta.fr
 */
export async function GET() {
  try {
    // Vérifier le cache
    if (cachedTirages && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json(cachedTirages);
    }

    // Fetch la page d'accueil
    const response = await fetch('https://lotofiesta.fr/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parser le HTML pour extraire les tirages
    const tirages = parseTiragesFromHTML(html);

    // Mettre en cache
    cachedTirages = tirages;
    cacheTimestamp = Date.now();

    return NextResponse.json(tirages);
  } catch (error) {
    console.error('Erreur fetch lotofiesta.fr:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les tirages' },
      { status: 500 }
    );
  }
}

/**
 * Parse le HTML de lotofiesta.fr pour extraire les tirages
 */
function parseTiragesFromHTML(html: string): LotoTirage[] {
  const tirages: LotoTirage[] = [];

  // Regex pour trouver les produits (tirages)
  // Structure: <a href="/produit/..."><img src="..." alt="..."></a>
  // <h2 class="woocommerce-loop-product__title">TITRE – JOUR DATE MOIS</h2>

  // Chercher les liens produits avec images
  const productRegex = /<a[^>]*href="(https?:\/\/lotofiesta\.fr\/produit\/[^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;

  // Chercher aussi les titres
  const titleRegex = /<h2[^>]*class="[^"]*woocommerce-loop-product__title[^"]*"[^>]*>([^<]+)<\/h2>/gi;

  // Extraire tous les produits
  const products: { url: string; imageUrl: string; alt: string }[] = [];
  let match;

  while ((match = productRegex.exec(html)) !== null) {
    products.push({
      url: match[1],
      imageUrl: match[2],
      alt: match[3],
    });
  }

  // Extraire tous les titres
  const titles: string[] = [];
  while ((match = titleRegex.exec(html)) !== null) {
    titles.push(match[1].trim());
  }

  // Combiner produits et titres
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const title = titles[i] || product.alt;

    // Extraire la date du titre (format: "TITRE – JOUR DATE MOIS")
    const dateMatch = title.match(/–\s*(\w+\s+\d+\s+\w+)\s*$/i);
    const date = dateMatch ? dateMatch[1].trim() : '';
    const eventTitle = title.replace(/\s*–\s*\w+\s+\d+\s+\w+\s*$/, '').trim();

    // Générer un ID unique basé sur l'URL
    const id = product.url
      .replace('https://lotofiesta.fr/produit/', '')
      .replace(/\/$/, '');

    tirages.push({
      id,
      title: eventTitle,
      date,
      url: product.url,
      imageUrl: product.imageUrl,
      prizes: [], // Seront chargés séparément via /api/lotofiesta/prizes
    });
  }

  return tirages;
}

/**
 * Trouve le tirage du jour
 */
export function findTodaysTirage(tirages: LotoTirage[]): LotoTirage | null {
  const today = new Date();
  const dayNames = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
  const monthNames = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
                      'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];

  const todayDay = dayNames[today.getDay()];
  const todayDate = today.getDate();
  const todayMonth = monthNames[today.getMonth()];

  // Chercher un tirage qui correspond à aujourd'hui
  for (const tirage of tirages) {
    const dateUpper = tirage.date.toUpperCase();
    if (
      dateUpper.includes(todayDay) &&
      dateUpper.includes(String(todayDate)) &&
      dateUpper.includes(todayMonth)
    ) {
      return tirage;
    }
  }

  // Si pas de tirage aujourd'hui, retourner le premier
  return tirages[0] || null;
}
