/**
 * Dictionnaire complet des numéros 1-90 en français
 * Inclut les variantes et prononciations
 */

const FRENCH_NUMBERS: Record<string, number> = {
  // Unités
  'un': 1,
  'une': 1,
  'deux': 2,
  'trois': 3,
  'quatre': 4,
  'cinq': 5,
  'six': 6,
  'sept': 7,
  'huit': 8,
  'neuf': 9,

  // 10-19
  'dix': 10,
  'onze': 11,
  'douze': 12,
  'treize': 13,
  'quatorze': 14,
  'quinze': 15,
  'seize': 16,
  'dix-sept': 17,
  'dix sept': 17,
  'dix-huit': 18,
  'dix huit': 18,
  'dix-neuf': 19,
  'dix neuf': 19,

  // 20-29
  'vingt': 20,
  'vingt-et-un': 21,
  'vingt et un': 21,
  'vingt-un': 21,
  'vingt un': 21,
  'vingt-deux': 22,
  'vingt deux': 22,
  'vingt-trois': 23,
  'vingt trois': 23,
  'vingt-quatre': 24,
  'vingt quatre': 24,
  'vingt-cinq': 25,
  'vingt cinq': 25,
  'vingt-six': 26,
  'vingt six': 26,
  'vingt-sept': 27,
  'vingt sept': 27,
  'vingt-huit': 28,
  'vingt huit': 28,
  'vingt-neuf': 29,
  'vingt neuf': 29,

  // 30-39
  'trente': 30,
  'trente-et-un': 31,
  'trente et un': 31,
  'trente-un': 31,
  'trente un': 31,
  'trente-deux': 32,
  'trente deux': 32,
  'trente-trois': 33,
  'trente trois': 33,
  'trente-quatre': 34,
  'trente quatre': 34,
  'trente-cinq': 35,
  'trente cinq': 35,
  'trente-six': 36,
  'trente six': 36,
  'trente-sept': 37,
  'trente sept': 37,
  'trente-huit': 38,
  'trente huit': 38,
  'trente-neuf': 39,
  'trente neuf': 39,

  // 40-49
  'quarante': 40,
  'quarante-et-un': 41,
  'quarante et un': 41,
  'quarante-un': 41,
  'quarante un': 41,
  'quarante-deux': 42,
  'quarante deux': 42,
  'quarante-trois': 43,
  'quarante trois': 43,
  'quarante-quatre': 44,
  'quarante quatre': 44,
  'quarante-cinq': 45,
  'quarante cinq': 45,
  'quarante-six': 46,
  'quarante six': 46,
  'quarante-sept': 47,
  'quarante sept': 47,
  'quarante-huit': 48,
  'quarante huit': 48,
  'quarante-neuf': 49,
  'quarante neuf': 49,

  // 50-59
  'cinquante': 50,
  'cinquante-et-un': 51,
  'cinquante et un': 51,
  'cinquante-un': 51,
  'cinquante un': 51,
  'cinquante-deux': 52,
  'cinquante deux': 52,
  'cinquante-trois': 53,
  'cinquante trois': 53,
  'cinquante-quatre': 54,
  'cinquante quatre': 54,
  'cinquante-cinq': 55,
  'cinquante cinq': 55,
  'cinquante-six': 56,
  'cinquante six': 56,
  'cinquante-sept': 57,
  'cinquante sept': 57,
  'cinquante-huit': 58,
  'cinquante huit': 58,
  'cinquante-neuf': 59,
  'cinquante neuf': 59,

  // 60-69
  'soixante': 60,
  'soixante-et-un': 61,
  'soixante et un': 61,
  'soixante-un': 61,
  'soixante un': 61,
  'soixante-deux': 62,
  'soixante deux': 62,
  'soixante-trois': 63,
  'soixante trois': 63,
  'soixante-quatre': 64,
  'soixante quatre': 64,
  'soixante-cinq': 65,
  'soixante cinq': 65,
  'soixante-six': 66,
  'soixante six': 66,
  'soixante-sept': 67,
  'soixante sept': 67,
  'soixante-huit': 68,
  'soixante huit': 68,
  'soixante-neuf': 69,
  'soixante neuf': 69,

  // 70-79 (soixante-dix)
  'soixante-dix': 70,
  'soixante dix': 70,
  'soixante-et-onze': 71,
  'soixante et onze': 71,
  'soixante-onze': 71,
  'soixante onze': 71,
  'soixante-douze': 72,
  'soixante douze': 72,
  'soixante-treize': 73,
  'soixante treize': 73,
  'soixante-quatorze': 74,
  'soixante quatorze': 74,
  'soixante-quinze': 75,
  'soixante quinze': 75,
  'soixante-seize': 76,
  'soixante seize': 76,
  'soixante-dix-sept': 77,
  'soixante dix sept': 77,
  'soixante-dix-huit': 78,
  'soixante dix huit': 78,
  'soixante-dix-neuf': 79,
  'soixante dix neuf': 79,

  // 80-89 (quatre-vingts)
  'quatre-vingts': 80,
  'quatre vingts': 80,
  'quatre-vingt': 80,
  'quatre vingt': 80,
  'quatre-vingt-un': 81,
  'quatre vingt un': 81,
  'quatre-vingt-deux': 82,
  'quatre vingt deux': 82,
  'quatre-vingt-trois': 83,
  'quatre vingt trois': 83,
  'quatre-vingt-quatre': 84,
  'quatre vingt quatre': 84,
  'quatre-vingt-cinq': 85,
  'quatre vingt cinq': 85,
  'quatre-vingt-six': 86,
  'quatre vingt six': 86,
  'quatre-vingt-sept': 87,
  'quatre vingt sept': 87,
  'quatre-vingt-huit': 88,
  'quatre vingt huit': 88,
  'quatre-vingt-neuf': 89,
  'quatre vingt neuf': 89,

  // 90 (quatre-vingt-dix)
  'quatre-vingt-dix': 90,
  'quatre vingt dix': 90,

  // Variantes belges/suisses
  'septante': 70,
  'septante-et-un': 71,
  'septante et un': 71,
  'septante-deux': 72,
  'septante deux': 72,
  'septante-trois': 73,
  'septante trois': 73,
  'septante-quatre': 74,
  'septante quatre': 74,
  'septante-cinq': 75,
  'septante cinq': 75,
  'septante-six': 76,
  'septante six': 76,
  'septante-sept': 77,
  'septante sept': 77,
  'septante-huit': 78,
  'septante huit': 78,
  'septante-neuf': 79,
  'septante neuf': 79,

  'huitante': 80,
  'octante': 80,
  'huitante-un': 81,
  'huitante un': 81,
  'huitante-deux': 82,
  'huitante deux': 82,
  'huitante-trois': 83,
  'huitante trois': 83,
  'huitante-quatre': 84,
  'huitante quatre': 84,
  'huitante-cinq': 85,
  'huitante cinq': 85,
  'huitante-six': 86,
  'huitante six': 86,
  'huitante-sept': 87,
  'huitante sept': 87,
  'huitante-huit': 88,
  'huitante huit': 88,
  'huitante-neuf': 89,
  'huitante neuf': 89,

  'nonante': 90,
};

/**
 * Parse un texte parlé et extrait les numéros de loto (1-90)
 */
export function parseSpokenNumbers(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const results: number[] = [];

  // D'abord chercher les nombres écrits en chiffres
  const digitMatches = normalized.match(/\b(\d{1,2})\b/g);
  if (digitMatches) {
    for (const match of digitMatches) {
      const num = parseInt(match, 10);
      if (num >= 1 && num <= 90 && !results.includes(num)) {
        results.push(num);
      }
    }
  }

  // Ensuite chercher les nombres en toutes lettres
  // Trier par longueur décroissante pour matcher les plus longs d'abord
  const sortedKeys = Object.keys(FRENCH_NUMBERS).sort((a, b) => b.length - a.length);

  let remaining = normalized;
  for (const key of sortedKeys) {
    if (remaining.includes(key)) {
      const num = FRENCH_NUMBERS[key];
      if (!results.includes(num)) {
        results.push(num);
      }
      // Retirer ce match pour éviter les doublons
      remaining = remaining.replace(key, ' ');
    }
  }

  return results;
}

/**
 * Convertit un numéro en texte français
 */
export function numberToFrench(num: number): string {
  if (num < 1 || num > 90) return String(num);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];

  const ten = Math.floor(num / 10);
  const unit = num % 10;

  if (num === 80) return 'quatre-vingts';
  if (num === 90) return 'quatre-vingt-dix';

  if (ten === 7) {
    // 70-79
    return `soixante-${teens[unit]}`;
  }

  if (ten === 9) {
    // 90
    return `quatre-vingt-${teens[unit]}`;
  }

  if (unit === 0) return tens[ten];
  if (unit === 1 && ten !== 8) return `${tens[ten]}-et-un`;
  return `${tens[ten]}-${units[unit]}`;
}
