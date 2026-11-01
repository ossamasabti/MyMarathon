import type { ReferenceInput, ReferenceKind } from '@/api/types';

/** Crossref work types -> our reference kinds. */
const KINDS: Record<string, ReferenceKind> = {
  'journal-article': 'article',
  'proceedings-article': 'conference',
  book: 'book',
  monograph: 'book',
  'edited-book': 'book',
  'book-chapter': 'book',
  dissertation: 'thesis',
  'posted-content': 'preprint',
};

interface CrossrefWork {
  type?: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  issued?: { 'date-parts'?: (number | null)[][] };
  'container-title'?: string[];
  publisher?: string;
  URL?: string;
  DOI?: string;
}

/** "https://doi.org/10.1007/BF00994018" -> "10.1007/BF00994018". */
export function cleanDoi(value: string): string {
  return value.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '');
}

export type DoiLookup = Pick<ReferenceInput, 'kind' | 'title' | 'authors' | 'year' | 'venue' | 'doi' | 'url'>;

/**
 * Metadata of a DOI from the public Crossref API, called from the device (nothing goes through our server).
 * Returns null when the DOI is unknown; throws on network errors.
 */
export async function lookupDoi(doi: string): Promise<DoiLookup | null> {
  const id = cleanDoi(doi);
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Crossref ${response.status}`);
  const work = ((await response.json()) as { message: CrossrefWork }).message;
  const authors = (work.author ?? [])
    .map((a) => (a.family ? [a.family, a.given].filter(Boolean).join(', ') : (a.name ?? '')))
    .filter(Boolean)
    .join('; ');
  const year = work.issued?.['date-parts']?.[0]?.[0] ?? null;
  const kind = KINDS[work.type ?? ''] ?? 'other';
  return {
    kind,
    title: work.title?.[0]?.trim() ?? '',
    authors,
    year: typeof year === 'number' ? year : null,
    venue: work['container-title']?.[0] ?? (kind === 'book' ? (work.publisher ?? '') : ''),
    doi: work.DOI ?? id,
    url: work.URL ?? '',
  };
}
