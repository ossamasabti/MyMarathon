import type { ReadingNoteKey } from '@/api/types';

export interface ReadingQuestion {
  /** Stable key stored in Reference.notes. */
  key: ReadingNoteKey;
  label: string;
  placeholder: string;
}

/** Reading notes of a reference, in the order a literature review needs them. */
export const READING_QUESTIONS: readonly ReadingQuestion[] = [
  { key: 'summary', label: 'Résumé', placeholder: 'Le problème traité et le message principal, en quelques phrases.' },
  { key: 'contribution', label: 'Contribution', placeholder: 'Ce que l’article apporte de nouveau.' },
  {
    key: 'method',
    label: 'Méthode et données',
    placeholder: 'Modèle, algorithme, jeux de données, métriques, résultats clés.',
  },
  { key: 'limits', label: 'Limites', placeholder: 'Hypothèses fortes, cas non traités, critiques.' },
  {
    key: 'ideas',
    label: 'Idées pour ma thèse',
    placeholder: 'Ce que je peux réutiliser, comparer ou améliorer.',
  },
];
