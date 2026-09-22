/** خوارزميات تطبيع وبحث عربي متسامح
 * - أحمد / احمد / إحمد / آحمد
 * - ة / ه ، ي / ى ، ؤ / و ، ئ / ي
 * - إزالة التشكيل والكشيدة
 * - تسامح غلط حرف واحد (Levenshtein)
 */

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    // تشكيل عربي + مدة
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // صفر-عرض / اتجاه
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    // ألف بأشكالها
    .replace(/[إأآٱٲٳ]/g, 'ا')
    // ى → ي ، ة → ه
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // أرقام عربية شرقية → لاتينية
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^A-Za-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** يولّد صيغ محتملة لنفس الكلمة حتى يطابق ilike في Postgres/Supabase */
export function expandArabicQueryVariants(query: string): string[] {
  const raw = query.trim();
  if (!raw) return [];
  const normalized = normalizeSearchText(raw);
  const variants = new Set<string>([raw, normalized]);

  // بدائل الألف في كل المواضع
  for (const alef of ['ا', 'أ', 'إ', 'آ']) {
    variants.add(normalized.replace(/ا/g, alef));
  }
  // ة ↔ ه في نهاية الكلمة
  variants.add(normalized.replace(/ه(\s|$)/g, 'ة$1'));
  variants.add(normalized.replace(/ة/g, 'ه'));
  // ي ↔ ى
  variants.add(normalized.replace(/ي/g, 'ى'));
  variants.add(normalized.replace(/ى/g, 'ي'));
  // بدون مسافات داخلية زائدة
  return Array.from(variants)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

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
};

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

/** ترتيب النتائج بعد التطبيع + تسامح حرف واحد للكلمات ≥ 3 */
export function rankSearchRows(rows: any[], query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return rows;
  const queryWords = normalized.split(' ').filter(Boolean);
  const expanded = new Set(queryWords);
  for (const word of queryWords) {
    for (const syn of searchSynonyms[word] ?? []) {
      expanded.add(normalizeSearchText(syn));
    }
  }
  return rows
    .map((row) => {
      const text = normalizeSearchText(
        [row.title, row.description, row.author, row.slug].filter(Boolean).join(' '),
      );
      const words = text.split(' ').filter(Boolean);
      let score = text.includes(normalized) ? 100 : 0;
      for (const word of Array.from(expanded)) {
        if (text.includes(word)) {
          score += queryWords.includes(word) ? 35 : 12;
        } else if (words.length) {
          const best = Math.min(...words.map((c) => levenshtein(word, c)));
          // تسامح غلط حرف واحد في كلمات من 3 حروف فأكثر
          if (best <= 1 && word.length >= 3) score += 20;
          else if (best <= 2 && word.length >= 5) score += 10;
          else score += Math.max(0, 8 - Math.min(8, best));
        }
      }
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.row.ratingCount ?? 0) - Number(a.row.ratingCount ?? 0),
    )
    .map((item) => item.row);
}
