/** بحث عربي متسامح + فهم نية دلالي بسيط (بدون AI API)
 * مثال: "عايز رواية رعب نفسي قصيرة" → genre: horror+psychological, length: short
 */

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[إأآٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مرادفات → slug التصنيف في قاعدة E7ketha */
export const GENRE_INTENT_MAP: Array<{ slug: string; terms: string[] }> = [
  { slug: 'horror', terms: ['رعب', 'مرعب', 'مخيف', 'خوف', 'horror', 'terror', 'مرعبة', 'رعبه'] },
  { slug: 'psychological', terms: ['نفسي', 'سيكولوجي', 'سيكولوجية', 'psychological', 'ذهني', 'عقل'] },
  { slug: 'mystery', terms: ['غموض', 'لغز', 'تحقيق', 'جريمة', 'mystery', 'بوليس', 'detective'] },
  { slug: 'romance', terms: ['رومانسي', 'رومانسية', 'حب', 'عاطفي', 'عشق', 'romance', 'غرام'] },
  { slug: 'fantasy', terms: ['فانتازيا', 'خيال', 'سحر', 'اسطوري', 'أسطوري', 'fantasy', 'عوالم'] },
  { slug: 'adventure', terms: ['مغامرة', 'مغامرات', 'رحلة', 'adventure', 'تشويق'] },
  { slug: 'historical', terms: ['تاريخي', 'تاريخ', 'قديم', 'historical', 'تراث'] },
  { slug: 'drama', terms: ['دراما', 'درامي', 'مأساوي', 'drama'] },
  { slug: 'comedy', terms: ['كوميدي', 'كوميديا', 'مضحك', 'فكاهي', 'comedy'] },
  { slug: 'sci-fi', terms: ['خيال علمي', 'علمي', 'sci-fi', 'scifi', 'فضاء', 'مستقبل'] },
  { slug: 'thriller', terms: ['اثاره', 'إثارة', 'thriller', 'تشويقي', 'مثير'] },
];

const STOP_WORDS = new Set(
  normalizeSearchText(
    'عايز اريد ابغى ابي ابي ابحث عن عني رواية روايات كتاب كتب شيء شي حاجه حاجة قصيرة طويل طويله طويلة من في على الي الى ال و او يا لو كان يكون تكون يبغى تبغى ابغى ممكن ارجو لو سمحت please want novel book short long',
  )
    .split(' ')
    .filter(Boolean),
);

const searchSynonyms: Record<string, string[]> = {
  رعب: ['خوف', 'مرعب', 'horror', 'terror'],
  خوف: ['رعب', 'مرعب', 'horror'],
  حب: ['رومانسي', 'رومانسية', 'عاطفة', 'romance'],
  رومانسي: ['حب', 'رومانسية', 'romance'],
  خيال: ['فانتازيا', 'سحر', 'اسطوري', 'fantasy'],
  فانتازيا: ['خيال', 'سحر', 'fantasy'],
  غموض: ['تحقيق', 'لغز', 'جريمة', 'mystery'],
  مغامرة: ['رحلة', 'تشويق', 'adventure'],
  تاريخ: ['تاريخي', 'قديم', 'historical'],
  نفسي: ['سيكولوجي', 'psychological'],
  قصيرة: ['مختصرة', 'اجزاء قليلة', 'standalone'],
  طويله: ['ملحمة', 'اجزاء', 'سلسلة'],
};

export type SearchIntent = {
  residualQuery: string;
  genreSlugs: string[];
  preferStatus?: 'standalone' | 'completed' | 'ongoing';
  maxParts?: number;
  minParts?: number;
  explanation: string[];
};

export function parseSearchIntent(raw: string): SearchIntent {
  const original = raw.trim();
  const normalized = normalizeSearchText(original);
  const explanation: string[] = [];
  if (!normalized) {
    return { residualQuery: '', genreSlugs: [], explanation };
  }

  const genreSlugs: string[] = [];
  for (const entry of GENRE_INTENT_MAP) {
    for (const term of entry.terms) {
      const nt = normalizeSearchText(term);
      if (nt && (normalized.includes(nt) || normalized.split(' ').includes(nt))) {
        if (!genreSlugs.includes(entry.slug)) {
          genreSlugs.push(entry.slug);
          explanation.push(`تصنيف: ${entry.terms[0]}`);
        }
        break;
      }
    }
  }

  let preferStatus: SearchIntent['preferStatus'];
  let maxParts: number | undefined;
  let minParts: number | undefined;

  if (/(قصير|مختصر|اجزاء قليله|جزء واحد|رواية واحده)/.test(normalized)) {
    preferStatus = 'standalone';
    maxParts = 3;
    explanation.push('تفضيل: رواية قصيرة');
  } else if (/(طويل|ملحمه|سلسله|اجزاء كثير|عده اجزاء)/.test(normalized)) {
    preferStatus = 'ongoing';
    minParts = 3;
    explanation.push('تفضيل: رواية طويلة / متعددة الأجزاء');
  } else if (/(مكتمله|منتهيه|انتهت)/.test(normalized)) {
    preferStatus = 'completed';
    explanation.push('تفضيل: مكتملة');
  }

  const genreTermSet = new Set(
    GENRE_INTENT_MAP.flatMap((g) => g.terms.map((t) => normalizeSearchText(t))).filter(Boolean),
  );
  const lengthCues = new Set(
    ['قصير', 'قصيرة', 'طويل', 'طويلة', 'مختصر', 'ملحمه', 'سلسله', 'مكتمله', 'منتهيه'].map(normalizeSearchText),
  );

  const residualWords = normalized
    .split(' ')
    .filter((w) => {
      if (!w || w.length < 2) return false;
      if (STOP_WORDS.has(w)) return false;
      if (genreTermSet.has(w)) return false;
      if (lengthCues.has(w)) return false;
      return true;
    });

  const residualQuery = residualWords.join(' ').trim();

  return { residualQuery, genreSlugs, preferStatus, maxParts, minParts, explanation };
}

export function expandArabicQueryVariants(query: string): string[] {
  const raw = query.trim();
  if (!raw) return [];
  const normalized = normalizeSearchText(raw);
  const variants = new Set<string>([raw, normalized]);

  for (const alef of ['ا', 'أ', 'إ', 'آ']) {
    variants.add(normalized.replace(/ا/g, alef));
  }
  variants.add(normalized.replace(/ه(\s|$)/g, 'ة$1'));
  variants.add(normalized.replace(/ة/g, 'ه'));
  variants.add(normalized.replace(/ي/g, 'ى'));
  variants.add(normalized.replace(/ى/g, 'ي'));

  for (const word of normalized.split(' ').filter(Boolean)) {
    for (const syn of searchSynonyms[word] ?? []) {
      variants.add(syn);
      variants.add(normalizeSearchText(syn));
    }
  }

  return Array.from(variants)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? previous
          : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

export function rankSearchRows(rows: any[], query: string, intent?: SearchIntent) {
  const normalized = normalizeSearchText(query);
  const intentGenres = new Set(intent?.genreSlugs ?? []);
  const queryWords = normalized.split(' ').filter(Boolean);
  const expanded = new Set(queryWords);
  for (const word of queryWords) {
    for (const syn of searchSynonyms[word] ?? []) {
      expanded.add(normalizeSearchText(syn));
    }
  }
  const residual = intent?.residualQuery ? normalizeSearchText(intent.residualQuery).split(' ').filter(Boolean) : [];

  return rows
    .map((row) => {
      const text = normalizeSearchText(
        [row.title, row.description, row.author, row.slug, ...(row.genreNames ?? [])].filter(Boolean).join(' '),
      );
      const words = text.split(' ').filter(Boolean);
      let score = 0;
      if (normalized && text.includes(normalized)) score += 100;

      for (const word of Array.from(expanded)) {
        if (text.includes(word)) {
          score += residual.includes(word) ? 40 : queryWords.includes(word) ? 28 : 12;
        } else if (words.length) {
          const best = Math.min(...words.map((c) => levenshtein(word, c)));
          if (best <= 1 && word.length >= 3) score += 20;
          else if (best <= 2 && word.length >= 5) score += 10;
        }
      }

      const rowGenres: string[] = row.genreSlugs ?? [];
      for (const g of intentGenres) {
        if (rowGenres.includes(g)) score += 45;
      }

      const parts = Number(row.parts ?? 1);
      if (intent?.maxParts && parts <= intent.maxParts) score += 25;
      if (intent?.minParts && parts >= intent.minParts) score += 20;
      if (intent?.preferStatus && row.status === intent.preferStatus) score += 18;

      score += Math.min(15, Number(row.ratingCount ?? 0));
      score += Math.min(12, Number(row.rating ?? 0) / 50);

      return { row, score };
    })
    .filter((item) => item.score > 0 || !normalized)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.row.ratingCount ?? 0) - Number(a.row.ratingCount ?? 0),
    )
    .map((item) => item.row);
}
