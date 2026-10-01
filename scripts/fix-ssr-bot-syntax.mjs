import fs from 'fs';
const path = 'scripts/patch-ssr-bot-html.mjs';
if (!fs.existsSync(path)) process.exit(0);
let s = fs.readFileSync(path, 'utf8');
const broken = `['تفاصيل جديرة بالملاحظة', 'notableDetails'],
      "    ['عن الكاتب', 'aboutAuthor'], ['أعمال مشابهة', 'similarWorks'], ['دليل القراءة', 'seriesGuide'],
      "    ['أسئلة شائعة', 'faq'], ['أين تقرأها قانونيًا', 'whereToRead'],`;
const fixed = `['تفاصيل جديرة بالملاحظة', 'notableDetails'],",
      "    ['عن الكاتب', 'aboutAuthor'], ['أعمال مشابهة', 'similarWorks'], ['دليل القراءة', 'seriesGuide'],",
      "    ['أسئلة شائعة', 'faq'], ['أين تقرأها قانونيًا', 'whereToRead'],`;
if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  fs.writeFileSync(path, s);
  console.log('[fix-ssr-bot-syntax] repaired broken quotes');
} else {
  console.log('[fix-ssr-bot-syntax] ok');
}
