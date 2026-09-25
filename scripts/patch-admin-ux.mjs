/** Build-time admin UX fixes if source still has old patterns. */
import fs from 'node:fs';

function patchAdminPage() {
  const f = 'client/src/pages/AdminPage.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('/admin?s=') && s.includes('sectionFromUrl')) {
    console.log('[patch-admin-ux] AdminPage already ok');
    return;
  }
  const oldNav = `onClick={() => {\n                setSection(item.key);\n                onClose();\n                if (item.key === 'novels') navigate('/novels');\n                if (item.key === 'overview') navigate('/');\n              }`;
  const newNav = `onClick={() => {\n                setSection(item.key);\n                onClose();\n                if (item.key === 'overview') navigate('/admin');\n                else navigate(\`/admin?s=\${item.key}\`);\n              }`;
  if (s.includes(oldNav)) s = s.replace(oldNav, newNav);
  const oldInit = "const [section, setSection] = useState<Section>(location.startsWith('/novels') ? 'novels' : 'overview');";
  const newInit = `const sectionFromUrl = (() => {\n    try {\n      const q = new URLSearchParams(window.location.search).get('s');\n      if (q && (nav as readonly { key: string }[]).some((n) => n.key === q)) return q as Section;\n    } catch { /* ignore */ }\n    if (location.startsWith('/novels')) return 'novels' as Section;\n    return 'overview' as Section;\n  })();\n  const [section, setSection] = useState<Section>(sectionFromUrl);\n  useEffect(() => { setSection(sectionFromUrl); }, [location, sectionFromUrl]);`;
  if (s.includes(oldInit)) s = s.replace(oldInit, newInit);
  s = s.replace(
    "onSelect={(value) => { setSection(value); if (value === 'novels') navigate('/novels'); }}",
    "onSelect={(value) => { setSection(value); navigate(value === 'overview' ? '/admin' : `/admin?s=${value}`); }}",
  );
  if (!s.includes("import { useEffect, useState }")) {
    s = s.replace("import { useState } from 'react'", "import { useEffect, useState } from 'react'");
  }
  fs.writeFileSync(f, s);
  console.log('[patch-admin-ux] AdminPage patched');
}

function patchTrash() {
  const f = 'client/src/pages/AdminOperations.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  const old = "onClick={() => window.confirm('حذف نهائي؟') && purge.mutate({ id: item.id })}";
  const neu = "onClick={() => { const typed = window.prompt('حذف نهائي لا يُسترجع. اكتب كلمة حذف للتأكيد:'); if (typed === 'حذف') purge.mutate({ id: item.id }); else if (typed != null) toast.error('لم يتم التأكيد — لم يُحذف شيء'); }}";
  if (s.includes(old)) {
    s = s.replace(old, neu);
    fs.writeFileSync(f, s);
    console.log('[patch-admin-ux] trash purge hardened');
  } else console.log('[patch-admin-ux] trash skip');
}

function patchQuotes() {
  const f = 'client/src/pages/AdminQuotesManager.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  const old = "if (window.confirm(`سيتم حذف ${duplicatePreview.data?.removeCount} اقتباس مكرر والإبقاء على نسخة واحدة من كل مجموعة. هل تتابع؟`)) deleteDuplicates.mutate({ ids: duplicatePreview.data.groups.flatMap((group) => group.remove.map((quote) => quote.id)) });";
  const neu = "const typed = window.prompt(`سيتم حذف ${duplicatePreview.data?.removeCount} اقتباس مكرر. اكتب حذف للتأكيد:`); if (typed === 'حذف') deleteDuplicates.mutate({ ids: duplicatePreview.data.groups.flatMap((group) => group.remove.map((quote) => quote.id)) }); else if (typed != null) toast.error('لم يتم التأكيد');";
  if (s.includes(old)) {
    s = s.replace(old, neu);
    fs.writeFileSync(f, s);
    console.log('[patch-admin-ux] quotes dedupe hardened');
  } else console.log('[patch-admin-ux] quotes skip');
}

patchAdminPage();
patchTrash();
patchQuotes();
