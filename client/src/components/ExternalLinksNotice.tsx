import { AlertTriangle } from 'lucide-react';

export function ExternalLinksNotice() {
  return <aside className="mt-4 rounded-[20px] border border-amber-300/60 bg-amber-50/80 p-5 text-sm leading-7 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100" role="note" aria-label="تنبيه بشأن الروابط الخارجية">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-1 shrink-0 text-amber-600 dark:text-amber-300" size={19} aria-hidden="true" />
      <div>
        <h3 className="mb-2 text-sm font-extrabold">تنبيه بشأن الروابط الخارجية</h3>
        <p>قد تحتوي بعض صفحات المنصة على روابط تؤدي إلى مواقع إلكترونية خارجية لا نديرها ولا نتحكم في محتواها أو سياساتها.</p>
        <p className="mt-2">نحن لا نستضيف الملفات الموجودة على المواقع الخارجية، ولا نتحمل مسؤولية محتوى أو توفر أو سياسات تلك المواقع.</p>
        <p className="mt-2">إذا كنت صاحب حقوق نشر لأي محتوى مرتبط من خلال المنصة وترى أن الرابط ينتهك حقوقك، يُرجى التواصل معنا عبر صفحة التواصل وحقوق الملكية الفكرية لمراجعة الرابط واتخاذ الإجراء المناسب.</p>
        <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/80"><strong>ملاحظة:</strong> إدراج رابط خارجي لا يعني بالضرورة أن المنصة تملك أو تدّعي ملكية المحتوى الموجود في الموقع الخارجي.</p>
      </div>
    </div>
  </aside>;
}
