import { ArrowLeft, ArrowUpLeft, Check, ChevronLeft, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { novels } from '@/lib/data';
import { NovelCard } from '@/components/NovelCard';

const steps = [
  { question: 'ما النوع الذي تحبه؟', options: ['فانتازيا', 'غموض', 'رعب', 'رومانسي', 'مغامرة', 'نفسي', 'تاريخي', 'خيال علمي'] },
  { question: 'ما مستوى التشويق الذي تريده؟', options: ['هادئ وتأملي', 'متوازن', 'مشوّق جدًا'] },
  { question: 'هل تريد رواية قصيرة أم طويلة؟', options: ['قصيرة وخفيفة', 'متوسطة', 'أحب التفاصيل'] },
  { question: 'هل تفضل سلسلة أم رواية منفردة؟', options: ['رواية منفردة', 'سلسلة أعيش معها', 'لا يهم'] },
];

export default function DiscoverPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const current = steps[step];
  const choose = (answer: string) => { const next = [...answers]; next[step] = answer; setAnswers(next); };
  if (step >= steps.length) return <div className="container py-12 md:py-20"><div className="mx-auto max-w-5xl"><div className="mb-12 text-center"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-[18px] bg-[#eceaff] text-[#6a60e6] dark:bg-[#25264e]"><Sparkles size={23} /></div><div className="section-label mb-3">نتيجة ذكية على ذوقك</div><h1 className="text-3xl font-extrabold tracking-[-.07em] md:text-5xl">وجدنا لك 5 روايات قد تناسب ذوقك</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">هذه بداية لطيفة. مع الوقت، كل اختيار منك يجعل اقتراحات رِواية أكثر قربًا لك.</p></div><div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{novels.slice(0, 5).map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div><div className="mt-10 flex justify-center gap-3"><button onClick={() => { setStep(0); setAnswers([]); }} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إعادة الاختبار</button><Link href="/explore" className="rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white dark:bg-[#eeeefe] dark:text-[#171e42]">استكشف كل الروايات</Link></div></div></div>;
  return <div className="container py-12 md:py-20"><div className="mx-auto max-w-3xl"><div className="mb-10 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> العودة</Link><span className="text-xs font-bold text-muted-foreground">{step + 1} / {steps.length}</span></div><div className="mb-8 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#7067ef] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_30px_80px_-50px_rgba(30,38,90,.5)] md:p-12"><div className="section-label mb-4">اكتشف روايتك القادمة</div><h1 className="text-3xl font-extrabold tracking-[-.07em] md:text-5xl">{current.question}</h1><div className="mt-10 grid gap-3 sm:grid-cols-2">{current.options.map((option) => <button key={option} onClick={() => choose(option)} className={`group flex items-center justify-between rounded-[16px] border p-4 text-right text-sm font-bold transition hover:-translate-y-0.5 hover:border-[#857df1] hover:bg-[#f8f7ff] dark:hover:bg-[#202044] ${answers[step] === option ? 'border-[#7067ef] bg-[#f0eeff] text-[#5d52dd] dark:bg-[#24224c] dark:text-[#b6b0ff]' : 'border-border'}`}><span>{option}</span>{answers[step] === option ? <Check size={17} /> : <ChevronLeft size={16} className="text-muted-foreground transition-transform group-hover:-translate-x-1" />}</button>)}</div><div className="mt-10 flex justify-end"><button disabled={!answers[step]} onClick={() => setStep(step + 1)} className="flex items-center gap-2 rounded-xl bg-[#171e42] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#2c3769] disabled:cursor-not-allowed disabled:opacity-35 dark:bg-[#eeeefe] dark:text-[#171e42]">{step === steps.length - 1 ? 'اعرض اقتراحاتي' : 'التالي'} <ArrowUpLeft size={16} /></button></div></div></div></div>;
}
