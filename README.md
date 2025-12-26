# Loto Fiesta

Application de suivi de loto en temps réel pour les tirages Loto Fiesta sur YouTube.

## Fonctionnalités

- **Scan OCR** : Photographiez vos cartons, l'application extrait automatiquement les numéros
- **Saisie manuelle** : Entrez les numéros de vos cartons manuellement
- **Clavier numérique** : Saisissez rapidement les boules tirées (1-90)
- **Reconnaissance vocale** : Détection automatique des numéros annoncés en français
- **Alertes en temps réel** :
  - Quine (1 ligne complète)
  - Double quine (2 lignes complètes)
  - Carton plein (3 lignes complètes)
  - "Plus qu'un numéro !" avant chaque gain
- **Sons et vibrations** : Notifications sonores et haptiques
- **Mode sombre** : Support automatique du thème sombre
- **PWA** : Installable sur mobile comme une application native

## Stack technique

- **Next.js 16** - Framework React
- **React 19** - Interface utilisateur
- **TypeScript** - Typage statique
- **Tailwind CSS 4** - Styling
- **Zustand** - Gestion d'état
- **Tesseract.js** - OCR
- **Howler.js** - Sons
- **Web Speech API** - Reconnaissance vocale

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/titof2710/Loto.git
cd loto

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build production
npm run build
npm start
```

## Déploiement sur Vercel

1. Connectez votre dépôt GitHub à Vercel
2. Vercel détecte automatiquement Next.js
3. Cliquez sur "Deploy"

## Utilisation

1. **Ajouter une planche** : Allez sur "Scanner" pour photographier ou saisir vos 12 cartons
2. **Démarrer la partie** : Cliquez sur "Démarrer" dans l'onglet "Jouer"
3. **Saisir les boules** : Utilisez le clavier numérique ou activez la reconnaissance vocale
4. **Suivre les alertes** : Les cartons proches d'un gain sont mis en évidence

## Licence

MIT - titof2710
