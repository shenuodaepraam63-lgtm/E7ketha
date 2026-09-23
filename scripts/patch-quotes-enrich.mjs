#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = join(root, "server", "quotes.ts");
if (!existsSync(p)) process.exit(0);
let t = readFileSync(p, "utf8");
if (t.includes("Only fetch what we need")) {
  console.log("[patch-quotes-enrich] already applied");
  process.exit(0);
}
const old = `async function enrichQuotes(rows: QuoteRecord[]) { const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter((id): id is number => Number.isInteger(id)))); const bookIds = Array.from(new Set(rows.map((row) => row.novel_id).filter((id): id is number => Number.isInteger(id)))); const [authors, books] = await Promise.all([authorIds.length === rows.length ? request<Array<{ id: number; name: string; slug: string }>>(\`authors?select=id,name,slug&id=in.(\${authorIds.join(',')})\`) : listQuoteAuthors(), bookIds.length === rows.length ? request<Array<{ id: number; title: string; slug: string; authorId: number }>>(\`novels?select=id,title,slug,authorId&id=in.(\${bookIds.join(',')})\`) : listQuoteBooks()]); return rows.map((row) => { const author = authors.find((item) => item.id === row.author_id) ?? matchEntity(row.speaker, authors); const book = books.find((item) => item.id === row.novel_id) ?? matchEntity(row.book_title, books); return { ...row, quote_text: cleanImportedQuote(row.quote_text), author_id: author?.id ?? row.author_id ?? null, author_name: author?.name ?? row.speaker, author_slug: author?.slug ?? null, book_id: book?.id ?? row.novel_id ?? null, book_title: book?.title ?? row.book_title, book_slug: book?.slug ?? null }; }); }`;
const neu = `async function enrichQuotes(rows: QuoteRecord[]) {
  if (!rows.length) return [];
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter((id): id is number => Number.isInteger(id) && id > 0)));
  const bookIds = Array.from(new Set(rows.map((row) => row.novel_id).filter((id): id is number => Number.isInteger(id) && id > 0)));
  // Only fetch what we need — avoid loading all novels/authors on every page
  let authors: Array<{ id: number; name: string; slug: string }> = [];
  let books: Array<{ id: number; title: string; slug: string; authorId: number }> = [];
  try {
    if (authorIds.length) authors = await request(\`authors?select=id,name,slug&id=in.(\${authorIds.join(',')})\`);
    if (bookIds.length) books = await request(\`novels?select=id,title,slug,authorId&id=in.(\${bookIds.join(',')})\`);
  } catch (e) { console.warn('[enrichQuotes] id lookup failed', e); }
  const needSpeakerMatch = rows.some((row) => !(row.author_id) && (row.speaker || '').trim());
  const needBookMatch = rows.some((row) => !(row.novel_id) && (row.book_title || '').trim());
  if (needSpeakerMatch || needBookMatch) {
    try {
      const [allAuthors, allBooks] = await Promise.all([
        needSpeakerMatch ? listQuoteAuthors() : Promise.resolve(authors),
        needBookMatch ? listQuoteBooks() : Promise.resolve(books),
      ]);
      if (needSpeakerMatch) authors = allAuthors;
      if (needBookMatch) books = allBooks;
    } catch (e) { console.warn('[enrichQuotes] match catalogs failed', e); }
  }
  return rows.map((row) => {
    const author = authors.find((item) => item.id === row.author_id) ?? matchEntity(row.speaker, authors);
    const book = books.find((item) => item.id === row.novel_id) ?? matchEntity(row.book_title, books);
    return { ...row, quote_text: cleanImportedQuote(row.quote_text), author_id: author?.id ?? row.author_id ?? null, author_name: author?.name ?? row.speaker, author_slug: author?.slug ?? null, book_id: book?.id ?? row.novel_id ?? null, book_title: book?.title ?? row.book_title, book_slug: book?.slug ?? null };
  });
}`;
if (!t.includes(old)) {
  console.warn("[patch-quotes-enrich] old enrichQuotes not found");
  process.exit(0);
}
writeFileSync(p, t.replace(old, neu));
console.log("[patch-quotes-enrich] applied");
