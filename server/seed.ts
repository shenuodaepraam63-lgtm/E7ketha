import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { authors, genres, novels, novelGenres, series, seriesBooks } from '../drizzle/schema';

const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });
const db = drizzle(pool);
const cover = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=88`;

const authorRows = [
  { slug: 'amr-abdel-hamid', name: 'عمرو عبد الحميد', bio: 'كاتب وروائي مصري، يكتب عوالم فانتازية بأسئلة إنسانية قريبة.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85', bookCount: 12 },
  { slug: 'ahmed-khaled-tawfik', name: 'أحمد خالد توفيق', bio: 'صوت مؤثر في أدب الرعب والخيال العلمي العربي.', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=85', bookCount: 34 },
  { slug: 'khawla-hamdi', name: 'خولة حمدي', bio: 'روائية تونسية تهتم بالعلاقات الإنسانية والهوية والاختيار.', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=85', bookCount: 8 },
  { slug: 'ahmed-mourad', name: 'أحمد مراد', bio: 'روائي وسيناريست يشتغل على الغموض والطبقات النفسية.', avatarUrl: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=240&q=85', bookCount: 7 },
  { slug: 'radwa-ashour', name: 'رضوى عاشور', bio: 'كاتبة وأكاديمية تركت أثرًا عميقًا في الرواية العربية الحديثة.', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=85', bookCount: 15 },
  { slug: 'youssef-ziedan', name: 'يوسف زيدان', bio: 'كاتب وباحث يهتم بالتاريخ والفكر والرحلة الداخلية.', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=85', bookCount: 11 },
];
const genreRows = [
  { slug: 'fantasy', name: 'فانتازيا', description: 'عوالم أخرى، وقوانين جديدة للدهشة.', icon: '✦' },
  { slug: 'mystery', name: 'غموض', description: 'أسئلة لا تُغلق أبوابها بسهولة.', icon: '⌁' },
  { slug: 'romance', name: 'رومانسي', description: 'حكايات القرب والاختيار.', icon: '◒' },
  { slug: 'horror', name: 'رعب', description: 'ما يختبئ خلف المألوف.', icon: '◈' },
  { slug: 'adventure', name: 'مغامرة', description: 'رحلات تبدأ من سؤال صغير.', icon: '↗' },
  { slug: 'psychological', name: 'نفسي', description: 'داخل الإنسان، حيث تتغير الخرائط.', icon: '◌' },
  { slug: 'historical', name: 'تاريخي', description: 'زمن بعيد بعيون قريبة.', icon: '⌂' },
  { slug: 'sci-fi', name: 'خيال علمي', description: 'ماذا لو أصبح المستقبل الآن؟', icon: '⊹' },
];
const novelRows = [
  ['ard-zikola', 'أرض زيكولا', 'amr-abdel-hamid', ['fantasy', 'adventure'], 460, 3, 'completed', 2010, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=88', 'رحلة إلى أرض لا تُقاس فيها قيمة الإنسان بما يملك، بل بما يستطيع أن يمنحه من ذكاء ودهشة.'],
  ['amareta', 'أماريتا', 'amr-abdel-hamid', ['fantasy'], 450, 3, 'completed', 2016, 'https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&w=700&q=88', 'حين تتغير موازين القوة، يصبح الخلاص قرارًا شجاعًا لا نهاية سعيدة جاهزة.'],
  ['fi-qalbi-untha-ibraria', 'في قلبي أنثى عبرية', 'khawla-hamdi', ['romance'], 440, 1, 'standalone', 2012, 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=700&q=88', 'حكاية عن الإيمان والاختيار والروابط التي تعبر الحدود حين تصبح القلوب أكثر شجاعة.'],
  ['utared', 'يوتوبيا', 'ahmed-khaled-tawfik', ['sci-fi', 'psychological'], 430, 1, 'standalone', 2008, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=88', 'مستقبل قريب يضع سؤال العدالة في مواجهة مدينة مغلقة لا ترى العالم إلا من خلف زجاجها.'],
  ['the-blue-elephant', 'الفيل الأزرق', 'ahmed-mourad', ['mystery', 'psychological'], 450, 3, 'completed', 2012, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=700&q=88', 'عودة إلى مكان قديم تكشف طبقات خفية من الذاكرة، حيث لا يبدو العقل شاهدًا محايدًا دائمًا.'],
  ['sahib-al-zill', 'صاحب الظل الطويل', 'khawla-hamdi', ['romance'], 410, 1, 'standalone', 2015, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=88', 'رسائل قليلة تفتح نافذة على حياة جديدة، وتمنح الوحدة معنى آخر أكثر دفئًا.'],
  ['nada-al-ghoroub', 'ندى الغروب', 'radwa-ashour', ['historical'], 470, 2, 'completed', 2018, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=700&q=88', 'ذاكرة مدينة تتكلم بصوت أهلها، وتحكي عن الفقد والمقاومة والقدرة على البدء من جديد.'],
  ['mashhad-al-akhir', 'المشهد الأخير', 'ahmed-mourad', ['romance', 'mystery'], 400, 1, 'standalone', 2020, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=700&q=88', 'قصة عن اختيارات صغيرة تقود إلى مشهد لا يمكن التراجع عنه، حتى لو بدا كل شيء عاديًا.'],
  ['madinat-al-ramad', 'مدينة الرماد', 'amr-abdel-hamid', ['fantasy', 'mystery'], 420, 2, 'ongoing', 2024, 'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=700&q=88', 'في مدينة تحفظ أسرارها داخل الرماد، يبحث شاب عن خريطة تقود إلى ذاكرة لم يعشها.'],
  ['sifr-al-bidaya', 'سِفر البداية', 'youssef-ziedan', ['historical'], 440, 1, 'standalone', 2019, 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88', 'تأمل روائي في المعرفة والرحلة، حيث يصبح البحث عن الحقيقة نوعًا من العودة إلى الذات.'],
] as const;

async function seed() {
  await db.insert(authors).values(authorRows).onConflictDoUpdate({ target: authors.slug, set: { updatedAt: new Date() } });
  for (const row of genreRows) {
    await db.insert(genres).values(row).onConflictDoUpdate({ target: genres.slug, set: { name: row.name, description: row.description, icon: row.icon } });
  }
  const authorIds = await db.select({ id: authors.id, slug: authors.slug }).from(authors);
  const genreIds = await db.select({ id: genres.id, slug: genres.slug }).from(genres);
  const authorId = new Map(authorIds.map((item) => [item.slug, item.id]));
  const genreId = new Map(genreIds.map((item) => [item.slug, item.id]));
  for (const [slug, title, authorSlug, novelGenres, rating, parts, status, year, coverUrl, description] of novelRows) {
    const currentAuthorId = authorId.get(authorSlug);
    if (!currentAuthorId) continue;
    await db.insert(novels).values({ slug, title, authorId: currentAuthorId, coverUrl, description, rating, ratingCount: 0, parts, status, publicationYear: year }).onConflictDoUpdate({ target: novels.slug, set: { title, coverUrl, description, rating, parts, status, publicationYear: year, updatedAt: new Date() } });
  }
  const novelIds = await db.select({ id: novels.id, slug: novels.slug }).from(novels);
  const novelId = new Map(novelIds.map((item) => [item.slug, item.id]));
  for (const [slug, , , genreSlugs] of novelRows) {
    const currentNovelId = novelId.get(slug);
    if (!currentNovelId) continue;
    for (const genreSlug of genreSlugs) {
      const currentGenreId = genreId.get(genreSlug);
      if (currentGenreId) await db.insert(novelGenres).values({ novelId: currentNovelId, genreId: currentGenreId }).onConflictDoNothing();
    }
  }
  for (const row of [
    { slug: 'zikola', title: 'ثلاثية أرض زيكولا', description: 'رحلة فانتازية ممتدة.', status: 'completed' as const },
    { slug: 'blue-elephant', title: 'ثلاثية الفيل الأزرق', description: 'غموض نفسي على ثلاثة أجزاء.', status: 'completed' as const },
  ]) {
    await db.insert(series).values(row).onConflictDoUpdate({ target: series.slug, set: { title: row.title, description: row.description, status: row.status } });
  }
  console.log(`Seeded ${novelRows.length} novels, ${authorRows.length} authors, and ${genreRows.length} genres.`);
  await pool.end();
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });
