import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LotoTirage, LotoPrize, PrizeType } from '@/types';

interface TirageStore {
  // État
  allTirages: LotoTirage[];
  currentTirage: LotoTirage | null;
  currentGroupIndex: number;           // Index du groupe actuel (0, 3, 6, 9...)
  currentTypeInGroup: PrizeType;       // Type actuel dans le groupe (Q, DQ, CP)
  isLoading: boolean;
  isPrizesLoading: boolean;
  error: string | null;

  // Actions
  loadTirages: () => Promise<void>;
  selectTirage: (tirageId: string) => Promise<void>;
  loadPrizesForTirage: (tirage: LotoTirage) => Promise<LotoTirage>;
  advanceToNextType: () => void;       // Q→DQ→CP (appelé après un gain)
  nextGroup: () => void;               // Passe au groupe suivant (bouton "Cadeau gagné" sur CP)
  resetToFirstGroup: () => void;
  getCurrentPrize: () => LotoPrize | null;
  getNextPrize: () => LotoPrize | null;
  isLastTypeInGroup: () => boolean;
}

// Mapping type -> offset dans le groupe
const typeToOffset: Record<PrizeType, number> = {
  'Q': 0,
  'DQ': 1,
  'CP': 2,
};

// Mapping offset -> type
const offsetToType: PrizeType[] = ['Q', 'DQ', 'CP'];

export const useTirageStore = create<TirageStore>()(
  persist(
    (set, get) => ({
      // État initial
      allTirages: [],
      currentTirage: null,
      currentGroupIndex: 0,
      currentTypeInGroup: 'Q',
      isLoading: false,
      isPrizesLoading: false,
      error: null,

      // Charger la liste des tirages depuis lotofiesta.fr
      loadTirages: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/lotofiesta');
          if (!response.ok) {
            throw new Error('Erreur chargement tirages');
          }

          const tirages: LotoTirage[] = await response.json();
          set({ allTirages: tirages, isLoading: false });

          // Si pas de tirage sélectionné, sélectionner le premier (aujourd'hui)
          const state = get();
          if (!state.currentTirage && tirages.length > 0) {
            // Trouver le tirage du jour ou prendre le premier
            const todayTirage = findTodaysTirage(tirages) || tirages[0];
            await get().selectTirage(todayTirage.id);
          }
        } catch (error) {
          console.error('Erreur loadTirages:', error);
          set({ isLoading: false, error: 'Impossible de charger les tirages' });
        }
      },

      // Sélectionner un tirage et charger ses lots
      selectTirage: async (tirageId: string) => {
        const state = get();
        const tirage = state.allTirages.find(t => t.id === tirageId);

        if (!tirage) {
          console.error('Tirage non trouvé:', tirageId);
          return;
        }

        // Si les lots ne sont pas chargés, les charger
        let updatedTirage = tirage;
        if (tirage.prizes.length === 0) {
          updatedTirage = await get().loadPrizesForTirage(tirage);
        }

        set({
          currentTirage: updatedTirage,
          currentGroupIndex: 0,
          currentTypeInGroup: 'Q',
        });
      },

      // Charger les lots pour un tirage via OCR
      loadPrizesForTirage: async (tirage: LotoTirage): Promise<LotoTirage> => {
        set({ isPrizesLoading: true });

        try {
          const response = await fetch('/api/lotofiesta/prizes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tirageUrl: tirage.url }),
          });

          if (!response.ok) {
            throw new Error('Erreur OCR lots');
          }

          const data = await response.json();
          const prizes: LotoPrize[] = data.prizes || [];

          console.log('Lots chargés:', prizes.length);

          // Mettre à jour le tirage avec les lots
          const updatedTirage: LotoTirage = {
            ...tirage,
            prizes,
            prizesImageUrl: data.prizesImageUrl,
          };

          // Mettre à jour dans la liste
          set(state => ({
            allTirages: state.allTirages.map(t =>
              t.id === tirage.id ? updatedTirage : t
            ),
            isPrizesLoading: false,
          }));

          return updatedTirage;
        } catch (error) {
          console.error('Erreur loadPrizesForTirage:', error);
          set({ isPrizesLoading: false });
          return tirage;
        }
      },

      // Passer au type suivant dans le groupe (Q→DQ→CP)
      // Appelé quand quelqu'un gagne (bouton "Cadeau gagné" ou auto si c'est toi)
      advanceToNextType: () => {
        const state = get();
        const currentOffset = typeToOffset[state.currentTypeInGroup];

        if (currentOffset < 2) {
          // Passer au type suivant (Q→DQ ou DQ→CP)
          set({ currentTypeInGroup: offsetToType[currentOffset + 1] });
        } else {
          // On est sur CP, passer au groupe suivant
          get().nextGroup();
        }
      },

      // Passer au groupe suivant (cadeaux 4,5,6 puis 7,8,9 etc.)
      // Efface aussi les boules tirées (via gameStore depuis game/page.tsx)
      nextGroup: () => {
        set(state => ({
          currentGroupIndex: state.currentGroupIndex + 3,
          currentTypeInGroup: 'Q',
        }));
      },

      // Revenir au premier groupe
      resetToFirstGroup: () => {
        set({
          currentGroupIndex: 0,
          currentTypeInGroup: 'Q',
        });
      },

      // Obtenir le cadeau actuel
      getCurrentPrize: (): LotoPrize | null => {
        const state = get();
        if (!state.currentTirage || state.currentTirage.prizes.length === 0) {
          return null;
        }

        const offset = typeToOffset[state.currentTypeInGroup];
        const prizeIndex = state.currentGroupIndex + offset;

        return state.currentTirage.prizes[prizeIndex] || null;
      },

      // Obtenir le prochain cadeau (pour preview)
      getNextPrize: (): LotoPrize | null => {
        const state = get();
        if (!state.currentTirage || state.currentTirage.prizes.length === 0) {
          return null;
        }

        const currentOffset = typeToOffset[state.currentTypeInGroup];
        let nextIndex: number;

        if (currentOffset < 2) {
          nextIndex = state.currentGroupIndex + currentOffset + 1;
        } else {
          nextIndex = state.currentGroupIndex + 3; // Premier du groupe suivant
        }

        return state.currentTirage.prizes[nextIndex] || null;
      },

      // Vérifie si on est sur le dernier type du groupe (CP)
      isLastTypeInGroup: (): boolean => {
        return get().currentTypeInGroup === 'CP';
      },
    }),
    {
      name: 'loto-tirage',
      partialize: (state) => ({
        currentTirage: state.currentTirage,
        currentGroupIndex: state.currentGroupIndex,
        currentTypeInGroup: state.currentTypeInGroup,
      }),
    }
  )
);

/**
 * Trouve le tirage du jour
 */
function findTodaysTirage(tirages: LotoTirage[]): LotoTirage | null {
  const today = new Date();
  const dayNames = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
  const monthNames = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
                      'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];

  const todayDay = dayNames[today.getDay()];
  const todayDate = today.getDate();
  const todayMonth = monthNames[today.getMonth()];

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

  return null;
}
