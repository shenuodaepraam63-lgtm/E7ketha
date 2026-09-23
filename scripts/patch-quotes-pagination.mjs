/**
 * Quotes: load only the active page (no placeholderData of previous pages).
 * Reset to page 1 when search/category changes.
 */
import fs from "node:fs";
import path from "node:path";

const target = path.resolve("client/src/pages/QuotesPage.tsx");
if (!fs.existsSync(target)) {
  console.warn("[patch-quotes-pagination] QuotesPage.tsx missing — skip");
  process.exit(0);
}
let src = fs.readFileSync(target, "utf8");
const MARKER = "/* PATCH_QUOTES_PAGINATION */";
if (src.includes(MARKER)) {
  console.log("[patch-quotes-pagination] already applied");
  process.exit(0);
}

const oldQuery = `const query = trpc.quotes.list.useQuery(
    { limit: PAGE_SIZE, offset },
    { placeholderData: (previous) => previous },
  );`;
const newQuery = `const query = trpc.quotes.list.useQuery(
    { limit: PAGE_SIZE, offset },
    {
      ${MARKER}
      // Only the active page — no previous-page bleed into the grid.
      placeholderData: undefined,
      refetchOnMount: false,
      staleTime: 60_000,
    },
  );`;

if (!src.includes(oldQuery)) {
  if (src.includes("placeholderData: undefined")) {
    console.log("[patch-quotes-pagination] already has page-only fetch");
    process.exit(0);
  }
  console.error("[patch-quotes-pagination] query block not found");
  process.exit(1);
}
src = src.replace(oldQuery, newQuery);

const needle = `const categories = trpc.quotes.categories.useQuery(undefined, { staleTime: 10 * 60 * 1000 });\n\n  const raw = query.data as unknown;`;
const insert = `const categories = trpc.quotes.categories.useQuery(undefined, { staleTime: 10 * 60 * 1000 });\n\n  useEffect(() => {\n    setPage(1);\n  }, [search, category]);\n\n  const raw = query.data as unknown;`;
if (src.includes(needle) && !src.includes("}, [search, category]);")) {
  src = src.replace(needle, insert);
}

src = src.replace(
  "{query.isLoading ? (",
  "{query.isLoading || (query.isFetching && !(Array.isArray(query.data) ? query.data : (query.data as { items?: unknown[] })?.items)?.length) ? (",
);

fs.writeFileSync(target, src);
console.log("[patch-quotes-pagination] applied");
