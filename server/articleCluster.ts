import { ENV } from './_core/env';
import { getNovelBySlug } from './db';
export const CLUSTER_TYPES = ['overview','summary','characters','themes','analysis','similar','author','reading-guide','faq','where-to-read'] as const;
export type ClusterType = (typeof CLUSTER_TYPES)[number];
export const CLUSTER_LABELS: Record<ClusterType,string> = {overview:'نظرة عامة وهل تناسبك',summary:'ملخص بدون حرق',characters:'الشخصيات',themes:'الأفكار والثيمات',analysis:'مراجعة وتحليل',similar:'أعمال مشابهة',author:'عن الكاتب والعمل','reading-guide':'دليل القراءة',faq:'أسئلة شائعة','where-to-read':'أين تقرأها قانونيًا'};
async function rest<T>(q:string,init?:RequestInit):Promise<T>{
  if(!ENV.supabaseUrl||!(ENV.supabaseSecretKey||ENV.supabasePublishableKey)) throw new Error('Supabase is not configured');
  const key=ENV.supabaseSecretKey||ENV.supabasePublishableKey!;
  const r=await fetch(`${ENV.supabaseUrl}/rest/v1/${q}`,{...init,signal:AbortSignal.timeout(20000),headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...(init?.headers??{})}});
  if(!r.ok) throw new Error(`Cluster API ${r.status}: ${await r.text()}`);
  const t=await r.text(); return (t?JSON.parse(t):[]) as T;
}
const slugify=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\u0600-\u06FFa-z0-9\-]/gi,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,160)||`a-${Date.now()}`;
type Ctx={id:number;slug:string;title:string;description:string;author:string;authorSlug:string;parts:number;status:string;year:number|null;coverUrl:string|null;genres:string[];links:{label:string;url:string}[];similar:{title:string;slug:string}[]};
async function loadCtx(x:number|string):Promise<Ctx|null>{
  let n:any; if(typeof x==='number'){n=(await rest<any[]>(`novels?select=id,slug,title,coverUrl,description,parts,status,publicationYear,authorId&id=eq.${x}&limit=1`))[0]; if(n){const a=(await rest<any[]>(`authors?select=name,slug&id=eq.${n.authorId}&limit=1`))[0]; n.author=a?.name??'مؤلف غير معروف'; n.authorSlug=a?.slug??'';}} else n=await getNovelBySlug(String(x));
  if(!n) return null; const id=Number(n.id);
  const gl=await rest<Array<{genreId:number}>>(`novelGenres?select=genreId&novelId=eq.${id}`).catch(()=>[]);
  const gids=[...new Set(gl.map(g=>Number(g.genreId)).filter(Boolean))];
  const genres=gids.length?(await rest<any[]>(`genres?select=name&id=in.(${gids.join(',')})`)).map(g=>String(g.name)):[];
  let links:Ctx['links']=[]; try{links=(await rest<any[]>(`novelLinks?select=label,url&novelId=eq.${id}`)).map(l=>({label:String(l.label),url:String(l.url)}));}catch{}
  let similar:Ctx['similar']=[]; try{if(gids.length){const ng=await rest<Array<{novelId:number}>>(`novelGenres?select=novelId&genreId=in.(${gids.join(',')})&limit=30`); const ids=[...new Set(ng.map(x=>Number(x.novelId)).filter(i=>i&&i!==id))].slice(0,8); if(ids.length) similar=(await rest<any[]>(`novels?select=title,slug&id=in.(${ids.join(',')})`)).map(r=>({title:String(r.title),slug:String(r.slug)}));}}catch{}
  return {id,slug:String(n.slug),title:String(n.title),description:String(n.description??''),author:String(n.author??'مؤلف غير معروف'),authorSlug:String(n.authorSlug??''),parts:Number(n.parts)||0,status:String(n.status??''),year:n.publicationYear==null?null:Number(n.publicationYear),coverUrl:n.coverUrl??null,genres,links,similar};
}
function build(type:ClusterType,n:Ctx){
  const g=n.genres.join('، ')||'تصنيفات متعددة'; const d=n.description||'الوصف غير مكتمل في القاعدة بعد.';
  const foot=`<h2>روابط داخل المنصة</h2><ul><li><a href="/books/${encodeURIComponent(n.slug)}">صفحة الرواية</a></li>${n.authorSlug?`<li><a href="/authors/${encodeURIComponent(n.authorSlug)}">${n.author}</a></li>`:''}${CLUSTER_TYPES.filter(t=>t!==type).map(t=>`<li><a href="/articles/${slugify(n.slug+'-'+t)}">${CLUSTER_LABELS[t]}</a></li>`).join('')}</ul>`;
  const T=n.title; const titles:Record<ClusterType,string>={overview:`نظرة عامة على رواية ${T} — هل تناسبك؟`,summary:`ملخص رواية ${T} بدون حرق`,characters:`شخصيات رواية ${T}`,themes:`أفكار وثيمات رواية ${T}`,analysis:`مراجعة وتحليل رواية ${T}`,similar:`روايات مشابهة لـ ${T}`,author:`${n.author} ورواية ${T}`,'reading-guide':`دليل قراءة رواية ${T}`,faq:`أسئلة شائعة عن رواية ${T}`,'where-to-read':`أين تقرأ رواية ${T} قانونيًا؟`};
  const bodies:Record<ClusterType,string>={
    overview:`<p>رواية «${T}» لـ ${n.author} ضمن ${g}.</p><p>${d}</p><p>الحالة: ${n.status}. أجزاء: ${n.parts||'—'}. سنة: ${n.year??'—'}</p><p>المنصة للاكتشاف دون استضافة ملفات.</p>${foot}`,
    summary:`<p>ملخص بدون حرق لـ «${T}».</p><p>${d}</p><p>إطار: ${g}. المؤلف: ${n.author}.</p>${foot}`,
    characters:`<p>لا قائمة شخصيات مفصّلة بعد.</p><p>${d}</p><p>في أعمال ${g} غالبًا ما يهم تطوّر الدوافع.</p>${foot}`,
    themes:`<p>«${T}» ضمن ${g}. ${d}</p>${foot}`,
    analysis:`<p>مراجعة معلوماتية لـ «${T}» — ليست تقييمًا نهائيًا.</p><p>${g} — ${n.status} — ${n.year??'—'}</p><p>${d}</p>${foot}`,
    similar:`<p>قريبة من «${T}» (${g}).</p>${n.similar.length?`<ul>${n.similar.map(s=>`<li><a href="/books/${encodeURIComponent(s.slug)}">${s.title}</a></li>`).join('')}</ul>`:'<p>لا قائمة بعد.</p>'}${foot}`,
    author:`<p>«${T}» من أعمال ${n.author}.</p>${n.authorSlug?`<p><a href="/authors/${encodeURIComponent(n.authorSlug)}">صفحة المؤلف</a></p>`:''}${foot}`,
    'reading-guide':`<p>الحالة: ${n.status}. أجزاء: ${n.parts||'—'}. سنة: ${n.year??'—'}</p><p>${n.parts>1?'التزم بترتيب الأجزاء.':'قراءة كوحدة واحدة.'}</p>${foot}`,
    faq:`<h2>التصنيف؟</h2><p>${g}</p><h2>المؤلف؟</h2><p>${n.author}</p><h2>مكتملة؟</h2><p>${n.status}</p><h2>تحميل من المنصة؟</h2><p>لا.</p>${foot}`,
    'where-to-read':`<p>لا نستضيف الملفات.</p>${n.links.length?`<ul>${n.links.map(l=>`<li><a href="${l.url}" rel="noopener noreferrer" target="_blank">${l.label||l.url}</a></li>`).join('')}</ul>`:'<p>لا روابط مسجّلة بعد.</p>'}${foot}`,
  };
  const title=titles[type]; const body=bodies[type];
  return {title,excerpt:CLUSTER_LABELS[type]+' — '+T,body,seoTitle:title,seoDescription:(CLUSTER_LABELS[type]+' — '+T).slice(0,160),tags:`${CLUSTER_LABELS[type]},${T},${n.author}`};
}
export async function listClusterArticlesForNovel(novelId:number){
  try{const rows=await rest<any[]>(`articles?select=id,slug,title,excerpt,coverUrl,status,clusterType,novelId&novelId=eq.${novelId}&order=clusterType.asc`);
  return rows.map(r=>({id:Number(r.id),slug:String(r.slug),title:String(r.title),excerpt:r.excerpt??null,coverUrl:r.coverUrl??null,status:String(r.status),clusterType:(r.clusterType as ClusterType)||null,label:r.clusterType?CLUSTER_LABELS[r.clusterType as ClusterType]||r.clusterType:null}));}catch{return[];}
}
export async function listPublishedClusterForNovel(novelId:number){return (await listClusterArticlesForNovel(novelId)).filter(a=>a.status==='published');}
export async function generateClusterDrafts(opts:{novelId?:number;slug?:string;types?:ClusterType[];force?:boolean}){
  const ctx=await loadCtx(opts.novelId??opts.slug??''); if(!ctx) throw new Error('الرواية غير موجودة');
  const types=(opts.types?.length?opts.types:[...CLUSTER_TYPES]) as ClusterType[];
  const existing=await listClusterArticlesForNovel(ctx.id); const byType=new Map(existing.filter(e=>e.clusterType).map(e=>[e.clusterType!,e]));
  const created:any[]=[],skipped:any[]=[],updated:any[]=[];
  for(const type of types){ if(!CLUSTER_TYPES.includes(type)) continue; const built=build(type,ctx); const preferredSlug=slugify(`${ctx.slug}-${type}`); const prev=byType.get(type);
    if(prev&&!opts.force){skipped.push({clusterType:type,reason:'موجود مسبقًا'}); continue;}
    if(prev&&opts.force){const rows=await rest<any[]>(`articles?id=eq.${prev.id}`,{method:'PATCH',body:JSON.stringify({title:built.title,excerpt:built.excerpt,content:built.body,coverUrl:ctx.coverUrl,seoTitle:built.seoTitle,seoDescription:built.seoDescription,tags:built.tags,novelId:ctx.id,clusterType:type,updatedAt:new Date().toISOString()})}); updated.push({id:Number(rows[0]?.id??prev.id),slug:String(rows[0]?.slug??prev.slug),clusterType:type);}
    else{let slug=preferredSlug; const clash=await rest<any[]>(`articles?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`); if(clash.length) slug=slugify(`${preferredSlug}-${Date.now().toString(36)}`);
      const rows=await rest<any[]>('articles',{method:'POST',body:JSON.stringify({slug,title:built.title,excerpt:built.excerpt,content:built.body,coverUrl:ctx.coverUrl,status:'draft',authorName:'فريق إحكيها',seoTitle:built.seoTitle,seoDescription:built.seoDescription,tags:built.tags,novelId:ctx.id,clusterType:type,publishedAt:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})});
      created.push({id:Number(rows[0].id),slug:String(rows[0].slug),clusterType:type,title:String(rows[0].title)});}}
  return {novelId:ctx.id,novelSlug:ctx.slug,novelTitle:ctx.title,created,updated,skipped,totalDraftTypes:types.length};
}
