import { invokeLLM } from './_core/llm';
import { ENV } from './_core/env';

export type QuoteRecord = { id: number; quote_text: string; speaker: string | null; book_title: string | null; novel_id: number | null; category: string | null; status: 'draft' | 'published'; created_at: string; updated_at: string };

async function request<T>(path: string, init: RequestInit = {}) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error('Supabase admin REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: ENV.supabaseSecretKey, Authorization: `Bearer ${ENV.supabaseSecretKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`Quotes API ${response.status}: ${await response.text()}`);
  const text = await response.text(); return (text ? JSON.parse(text) : []) as T;
}

export async function listQuotes(publicOnly = false) {
  return request<QuoteRecord[]>(`quotes?select=*&${publicOnly ? 'status=eq.published&' : ''}order=created_at.desc&limit=200`);
}
export async function createQuote(input: Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>) { return (await request<QuoteRecord[]>('quotes', { method: 'POST', body: JSON.stringify(input) }))[0]; }
export async function updateQuote(id: number, input: Partial<Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>>) { return (await request<QuoteRecord[]>(`quotes?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }) }))[0]; }
export async function deleteQuote(id: number) { await request(`quotes?id=eq.${id}`, { method: 'DELETE' }); return { success: true } as const; }

export async function improveQuote(input: { quote: string; speaker?: string; book?: string }) {
  const prompt = `حسّن هذا الاقتباس دون تغيير معناه، واقترح تصنيفًا مناسبًا. لا تخترع القائل أو الكتاب إذا لم يذكرهما المستخدم. أخرج JSON فقط بالمفاتيح quote, speaker, book, category, note.\nالنص: ${input.quote}\nالقائل إن وجد: ${input.speaker ?? ''}\nالكتاب إن وجد: ${input.book ?? ''}`;
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: 'أنت محرر محتوى عربي دقيق لمنصة روايات. لا تنسب قولًا دون مصدر.' }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }) });
    if (!response.ok) throw new Error(`Gemini API ${response.status}: ${await response.text()}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('لم تُرجع Gemini نتيجة صالحة');
    return JSON.parse(content) as { quote: string; speaker: string; book: string; category: string; note: string };
  }
  const result = await invokeLLM({ model: 'gpt-5-mini', maxTokens: 500, messages: [
    { role: 'system', content: 'أنت محرر محتوى عربي. ساعد مدير منصة روايات على تجهيز اقتباس للنشر. لا تنسب قولًا لشخص أو كتاب دون دليل؛ إذا لم يذكر المستخدم المصدر اتركه فارغًا. أخرج JSON فقط.' },
    { role: 'user', content: prompt },
  ], responseFormat: { type: 'json_schema', json_schema: { name: 'quote_editor', strict: true, schema: { type: 'object', properties: { quote: { type: 'string' }, speaker: { type: 'string' }, book: { type: 'string' }, category: { type: 'string' }, note: { type: 'string' } }, required: ['quote', 'speaker', 'book', 'category', 'note'], additionalProperties: false } } } });
  const content = result.choices[0]?.message.content; if (!content || typeof content !== 'string') throw new Error('لم تُرجع خدمة AI نتيجة صالحة');
  return JSON.parse(content) as { quote: string; speaker: string; book: string; category: string; note: string };
}
