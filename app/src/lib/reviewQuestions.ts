import type { ReviewType } from '@/api/types';

export interface ReviewQuestion {
  /** Stable key stored in Review.answers. */
  key: string;
  label: string;
  placeholder: string;
}

const COMMON: ReviewQuestion[] = [
  { key: 'advanced', label: 'Qu’est-ce qui a avancé ?', placeholder: 'Tes victoires, même petites…' },
  { key: 'blocked', label: 'Qu’est-ce qui t’a bloqué ?', placeholder: 'Obstacles, imprévus, manque de temps…' },
  {
    key: 'priorities',
    label: 'Quelles sont tes priorités pour la période suivante ?',
    placeholder: 'Deux ou trois priorités, reliées à tes objectifs.',
  },
];

const EXTRA: Record<ReviewType, ReviewQuestion[]> = {
  weekly: [],
  monthly: [
    {
      key: 'relevance',
      label: 'Tes objectifs du mois sont-ils toujours pertinents ?',
      placeholder: 'Faut-il en ajuster, en mettre en pause ou en abandonner ?',
    },
  ],
  quarterly: [
    { key: 'learnings', label: 'Qu’as-tu appris ce trimestre ?', placeholder: 'Sur toi, ta méthode, tes objectifs…' },
    {
      key: 'vision',
      label: 'Que veux-tu ajuster dans ta vision ?',
      placeholder: 'Ce qui reste juste, ce qui change.',
    },
  ],
};

export function reviewQuestions(type: ReviewType): ReviewQuestion[] {
  return [...COMMON, ...EXTRA[type]];
}
