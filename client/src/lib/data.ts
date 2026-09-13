export type Novel = {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorSlug: string;
  cover: string;
  genres: string[];
  rating: number;
  parts: number;
  status: string;
  description: string;
  accent: string;
};

export type Author = {
  name: string;
  slug: string;
  avatar: string;
  bio: string;
  books: number;
  genres: string[];
};

export const novels: Novel[] = [
  { id: '1', slug: 'ard-zikola', title: 'أرض زيكولا', author: 'عمرو عبد الحميد', authorSlug: 'amr-abdel-hamid', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=88', genres: ['فانتازيا', 'مغامرة'], rating: 4.6, parts: 3, status: 'مكتملة', description: 'رحلة إلى أرض لا تُقاس فيها قيمة الإنسان بما يملك، بل بما يستطيع أن يمنحه من ذكاء ودهشة.', accent: '#7c5cff' },
  { id: '2', slug: 'amareta', title: 'أماريتا', author: 'عمرو عبد الحميد', authorSlug: 'amr-abdel-hamid', cover: 'https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&w=700&q=88', genres: ['فانتازيا', 'سياسة'], rating: 4.5, parts: 3, status: 'مكتملة', description: 'حين تتغير موازين القوة، يصبح الخلاص قرارًا شجاعًا لا نهاية سعيدة جاهزة.', accent: '#c27155' },
  { id: '3', slug: 'fi-qalbi-untha-ibraria', title: 'في قلبي أنثى عبرية', author: 'خولة حمدي', authorSlug: 'khawla-hamdi', cover: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=700&q=88', genres: ['رومانسي', 'اجتماعي'], rating: 4.4, parts: 1, status: 'منفردة', description: 'حكاية عن الإيمان والاختيار والروابط التي تعبر الحدود حين تصبح القلوب أكثر شجاعة.', accent: '#b85a75' },
  { id: '4', slug: 'utared', title: 'يوتوبيا', author: 'أحمد خالد توفيق', authorSlug: 'ahmed-khaled-tawfik', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=88', genres: ['خيال علمي', 'نفسي'], rating: 4.3, parts: 1, status: 'منفردة', description: 'مستقبل قريب يضع سؤال العدالة في مواجهة مدينة مغلقة لا ترى العالم إلا من خلف زجاجها.', accent: '#4f8eaa' },
  { id: '5', slug: 'the-blue-elephant', title: 'الفيل الأزرق', author: 'أحمد مراد', authorSlug: 'ahmed-mourad', cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=700&q=88', genres: ['غموض', 'نفسي'], rating: 4.5, parts: 3, status: 'مكتملة', description: 'عودة إلى مكان قديم تكشف طبقات خفية من الذاكرة، حيث لا يبدو العقل شاهدًا محايدًا دائمًا.', accent: '#3c69a5' },
  { id: '6', slug: 'sahib-al-zill', title: 'صاحب الظل الطويل', author: 'سمر عبد الجابر', authorSlug: 'samar-abdelgaber', cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=88', genres: ['رومانسي', 'اجتماعي'], rating: 4.1, parts: 1, status: 'منفردة', description: 'رسائل قليلة تفتح نافذة على حياة جديدة، وتمنح الوحدة معنى آخر أكثر دفئًا.', accent: '#b68b45' },
  { id: '7', slug: 'nada-al-ghoroub', title: 'ندى الغروب', author: 'رضوى عاشور', authorSlug: 'radwa-ashour', cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=700&q=88', genres: ['تاريخي', 'دراما'], rating: 4.7, parts: 2, status: 'مكتملة', description: 'ذاكرة مدينة تتكلم بصوت أهلها، وتحكي عن الفقد والمقاومة والقدرة على البدء من جديد.', accent: '#a45e49' },
  { id: '8', slug: 'mashhad-al-akhir', title: 'المشهد الأخير', author: 'محمد صادق', authorSlug: 'mohamed-sadek', cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=700&q=88', genres: ['رومانسي', 'غموض'], rating: 4.0, parts: 1, status: 'منفردة', description: 'قصة عن اختيارات صغيرة تقود إلى مشهد لا يمكن التراجع عنه، حتى لو بدا كل شيء عاديًا.', accent: '#6c7a92' },
  { id: '9', slug: 'madinat-al-ramad', title: 'مدينة الرماد', author: 'ياسمين الخطيب', authorSlug: 'yasmin-elkhatib', cover: 'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=700&q=88', genres: ['فانتازيا', 'غموض'], rating: 4.2, parts: 2, status: 'مستمرة', description: 'في مدينة تحفظ أسرارها داخل الرماد، يبحث شاب عن خريطة تقود إلى ذاكرة لم يعشها.', accent: '#8c5b75' },
  { id: '10', slug: 'sifr-al-bidaya', title: 'سِفر البداية', author: 'يوسف زيدان', authorSlug: 'youssef-ziedan', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88', genres: ['تاريخي', 'فلسفي'], rating: 4.4, parts: 1, status: 'منفردة', description: 'تأمل روائي في المعرفة والرحلة، حيث يصبح البحث عن الحقيقة نوعًا من العودة إلى الذات.', accent: '#6f7d63' },
];

export const authors: Author[] = [
  { name: 'عمرو عبد الحميد', slug: 'amr-abdel-hamid', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85', bio: 'كاتب وروائي مصري، يكتب عوالم فانتازية بأسئلة إنسانية قريبة.', books: 12, genres: ['فانتازيا', 'مغامرة'] },
  { name: 'أحمد خالد توفيق', slug: 'ahmed-khaled-tawfik', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=85', bio: 'صوت مؤثر في أدب الرعب والخيال العلمي العربي.', books: 34, genres: ['رعب', 'خيال علمي'] },
  { name: 'خولة حمدي', slug: 'khawla-hamdi', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&q=85', bio: 'روائية تونسية تهتم بالعلاقات الإنسانية والهوية والاختيار.', books: 8, genres: ['رومانسي', 'اجتماعي'] },
  { name: 'أحمد مراد', slug: 'ahmed-mourad', avatar: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=240&q=85', bio: 'روائي وسيناريست يشتغل على الغموض والطبقات النفسية.', books: 7, genres: ['غموض', 'نفسي'] },
  { name: 'رضوى عاشور', slug: 'radwa-ashour', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=85', bio: 'كاتبة وأكاديمية، تركت أثرًا عميقًا في الرواية العربية الحديثة.', books: 15, genres: ['تاريخي', 'دراما'] },
  { name: 'يوسف زيدان', slug: 'youssef-ziedan', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=85', bio: 'كاتب وباحث يهتم بالتاريخ والفكر والرحلة الداخلية.', books: 11, genres: ['تاريخي', 'فلسفي'] },
];

export const genres = [
  { name: 'فانتازيا', slug: 'fantasy', count: 143, icon: '✦', description: 'عوالم أخرى، وقوانين جديدة للدهشة.' },
  { name: 'غموض', slug: 'mystery', count: 96, icon: '⌁', description: 'أسئلة لا تُغلق أبوابها بسهولة.' },
  { name: 'رومانسي', slug: 'romance', count: 128, icon: '◒', description: 'حكايات القرب والاختيار.' },
  { name: 'رعب', slug: 'horror', count: 61, icon: '◈', description: 'ما يختبئ خلف المألوف.' },
  { name: 'مغامرة', slug: 'adventure', count: 88, icon: '↗', description: 'رحلات تبدأ من سؤال صغير.' },
  { name: 'نفسي', slug: 'psychological', count: 74, icon: '◌', description: 'داخل الإنسان، حيث تتغير الخرائط.' },
  { name: 'تاريخي', slug: 'historical', count: 52, icon: '⌂', description: 'زمن بعيد بعيون قريبة.' },
  { name: 'خيال علمي', slug: 'sci-fi', count: 39, icon: '⊹', description: 'ماذا لو أصبح المستقبل الآن؟' },
];

export const series = [
  { title: 'ثلاثية أرض زيكولا', author: 'عمرو عبد الحميد', parts: 3, status: 'مكتملة', cover: novels[0].cover, books: ['أرض زيكولا', 'أماريتا', 'وادي الذئاب المنسية'] },
  { title: 'ثلاثية الفيل الأزرق', author: 'أحمد مراد', parts: 3, status: 'مكتملة', cover: novels[4].cover, books: ['الفيل الأزرق', 'الفيل الأزرق 2', 'الفيل الأزرق 3'] },
  { title: 'حكايات المدينة', author: 'ياسمين الخطيب', parts: 2, status: 'مستمرة', cover: novels[8].cover, books: ['مدينة الرماد', 'ما بعد الرماد'] },
];

export const searchSuggestions = ['روايات فانتازيا', 'روايات قصيرة', 'أحمد خالد توفيق', 'روايات رعب'];

export const findNovel = (slug?: string) => novels.find((novel) => novel.slug === slug) ?? novels[0];
export const findAuthor = (slug?: string) => authors.find((author) => author.slug === slug) ?? authors[0];

export const coverFallback = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88';

export function getSimilarNovels(novel: Novel) {
  return novels.filter((item) => item.id !== novel.id && item.genres.some((genre) => novel.genres.includes(genre))).slice(0, 5);
}

export function getAuthorNovels(authorSlug: string) {
  return novels.filter((novel) => novel.authorSlug === authorSlug);
}

export function getGenreNovels(genreName: string) {
  return novels.filter((novel) => novel.genres.includes(genreName));
}

export function formatCount(count: number) {
  return new Intl.NumberFormat('ar-EG').format(count);
}

export function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('');
}

export const navItems = [
  { label: 'الرئيسية', href: '/' },
  { label: 'استكشف', href: '/explore' },
  { label: 'التصنيفات', href: '/genres/fantasy' },
  { label: 'المؤلفون', href: '/authors/amr-abdel-hamid' },
  { label: 'السلاسل', href: '/series/zikola' },
];

export const adminNav = [
  { label: 'نظرة عامة', href: '/admin' },
  { label: 'الروايات', href: '/admin/books' },
  { label: 'المؤلفون', href: '/admin/authors' },
  { label: 'المصادر', href: '/admin/sources' },
  { label: 'محتوى AI', href: '/admin/ai' },
  { label: 'البلاغات', href: '/admin/reports' },
  { label: 'المستخدمون', href: '/admin/users' },
  { label: 'الإعدادات', href: '/admin/settings' },
];

export const statusStyles: Record<string, string> = {
  'مكتملة': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  'مستمرة': 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  'منفردة': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const adminRows = novels.slice(0, 6).map((novel, index) => ({
  ...novel,
  workflow: index === 1 ? 'قيد المراجعة' : index === 4 ? 'مسودة' : 'منشورة',
  updated: ['منذ ساعتين', 'أمس', 'منذ 3 أيام', 'منذ أسبوع', 'منذ أسبوعين', 'منذ شهر'][index],
}));

export const notifications = ['أضيف جزء جديد إلى سلسلة تتابعها', 'صدرت رواية جديدة لمؤلف تتابعه'];

export const stats = [
  { label: 'إجمالي الروايات', value: '500', change: '+12 هذا الشهر' },
  { label: 'المؤلفون', value: '180', change: '+8 هذا الشهر' },
  { label: 'المصادر', value: '620', change: '+24 هذا الشهر' },
  { label: 'تحتاج مراجعة', value: '24', change: '4 عاجلة' },
];

export const readingList = [novels[0], novels[4], novels[8]];
