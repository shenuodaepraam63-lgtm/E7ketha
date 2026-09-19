/** تطبيع وبحث عربي متسامح مع اختلاف الحروف (أحمد/احمد، ة/ه، ي/ى) */

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  return Array.from(variants).map((v) => v.trim()).filter((v) => v.length > 0);
}

const searchSynonyms: Record<string, string[]> = {
  رعب: ['خوف', 'مرعب', 'horror', 'terror'], خوف: ['رعب', 'مرعب', 'horror'],
  حب: ['رومانسي', 'رومانسية', 'عاطفة', 'romance'], رومانسي: ['حب', 'رومانسية', 'romance'],
  خيال: ['فانتازيا', 'سحر', 'اسطوري', 'fantasy'], فانتازيا: ['خيال', 'سحر', 'fantasy'],
  غموض: ['تحقيق', 'لغز', 'جريمة', 'mystery'], مغامرة: ['رحلة', 'تشويق', 'adventure'],
  تاريخ: ['تاريخي', 'قديم', 'historical'],
};

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1] ? previous : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

export function rankSearchRows(rows: any[], query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return rows;
  const queryWords = normalized.split(' ').filter(Boolean);
  const expanded = new Set(queryWords);
  queryWords.forEach((word) => (searchSynonyms[word] ?? []).forEach((item) => expanded.add(normalizeSearchText(item))));
  return rows
    .map((row) => {
      const text = normalizeSearchText([row.title, row.description, row.author, row.slug].filter(Boolean).join(' '));
      const words = text.split(' ').filter(Boolean);
      let score = text.includes(normalized) ? 100 : 0;
      for (const word of Array.from(expanded)) {
        if (text.includes(word)) score += queryWords.includes(word) ? 35 : 12;
        else if (words.length) {
          const best = Math.min(...words.map((candidate: string) => levenshtein(word, candidate)));
          if (best <= 1 && word.length >= 3) score += 20;
          else score += Math.max(0, 10 - Math.min(10, best));
        }
      }
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.row.ratingCount ?? 0) - Number(a.row.ratingCount ?? 0))
    .map((item) => item.row);
}
