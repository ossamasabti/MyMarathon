import type { Horizon } from '@/api/types';

/** From the longest horizon to the shortest. */
export const HORIZONS: readonly Horizon[] = ['vision', 'annual', 'quarterly', 'monthly'];

/** Horizons allowed for a child of a goal with the given horizon (strictly shorter). */
export function childHorizons(parent: Horizon | null | undefined): readonly Horizon[] {
  if (!parent) return HORIZONS;
  return HORIZONS.slice(HORIZONS.indexOf(parent) + 1);
}
