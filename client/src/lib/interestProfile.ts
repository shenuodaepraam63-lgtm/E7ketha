/** Reading interest profile — localStorage (works logged-out & logged-in). */

const KEY = 'e7k_interest_v1';

export type InterestProfile = {
  /** genre slugs preferred (ordered by priority) */
  genreSlugs: string[];
  /** display names parallel optional */
  genreNames: string[];
  /** short | medium | long | any */
  length: 'short' | 'medium' | 'long' | 'any';
  /** standalone | series | any */
  format: 'standalone' | 'series' | 'any';
  updatedAt: number;
};

function empty(): InterestProfile {
  return {
    genreSlugs: [],
    genreNames: [],
    length: 'any',
    format: 'any',
    updatedAt: 0,
  };
}

export function getInterestProfile(): InterestProfile {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<InterestProfile>;
    return {
      genreSlugs: Array.isArray(p.genreSlugs) ? p.genreSlugs.slice(0, 12) : [],
      genreNames: Array.isArray(p.genreNames) ? p.genreNames.slice(0, 12) : [],
      length: p.length === 'short' || p.length === 'medium' || p.length === 'long' ? p.length : 'any',
      format: p.format === 'standalone' || p.format === 'series' ? p.format : 'any',
      updatedAt: Number(p.updatedAt) || 0,
    };
  } catch {
    return empty();
  }
}

export function hasInterestProfile(): boolean {
  return getInterestProfile().genreSlugs.length >= 1;
}

export function saveInterestProfile(input: {
  genreSlugs: string[];
  genreNames?: string[];
  length?: InterestProfile['length'];
  format?: InterestProfile['format'];
}): InterestProfile {
  const profile: InterestProfile = {
    genreSlugs: input.genreSlugs.filter(Boolean).slice(0, 12),
    genreNames: (input.genreNames ?? []).slice(0, 12),
    length: input.length ?? 'any',
    format: input.format ?? 'any',
    updatedAt: Date.now(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* quota */
    }
  }
  return profile;
}

export function clearInterestProfile() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Map Arabic quiz labels → length/format */
export function lengthFromLabel(label: string): InterestProfile['length'] {
  if (label.includes('قصير')) return 'short';
  if (label.includes('متوسط')) return 'medium';
  if (label.includes('تفاصيل') || label.includes('طويل')) return 'long';
  return 'any';
}

export function formatFromLabel(label: string): InterestProfile['format'] {
  if (label.includes('منفرد')) return 'standalone';
  if (label.includes('سلسلة')) return 'series';
  return 'any';
}
