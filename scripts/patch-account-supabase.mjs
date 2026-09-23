/**
 * AccountPages: use getSupabase() instead of static supabase client.
 */
import fs from "node:fs";
import path from "node:path";

const target = path.resolve("client/src/pages/AccountPages.tsx");
if (!fs.existsSync(target)) {
  console.warn("[patch-account-supabase] missing — skip");
  process.exit(0);
}
let src = fs.readFileSync(target, "utf8");
const MARKER = "/* PATCH_ACCOUNT_SUPABASE */";
if (src.includes(MARKER) || (src.includes("getSupabase") && !src.includes("import { requireSupabase, supabase"))) {
  console.log("[patch-account-supabase] already applied or already migrated");
  process.exit(0);
}

src = src.replace(
  "import { requireSupabase, supabase, supabaseConfigured } from '@/lib/supabase';",
  "import { getSupabase, requireSupabase, supabaseConfigured } from '@/lib/supabase';\n" + MARKER,
);
src = src.replace("const client = requireSupabase();", "const client = await requireSupabase();");
src = src.replace(/if \(!supabaseConfigured \|\| !supabase\) \{/g, "if (!supabaseConfigured) {");
src = src.replace(/if \(!supabase\) \{/g, "if (!supabaseConfigured) {");
src = src.replace(/await supabase\.auth\./g, "await (await getSupabase())!.auth.");

fs.writeFileSync(target, src);
console.log("[patch-account-supabase] applied");
