import fs from "node:fs";
const f = "server/_core/supabaseAuth.ts";
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, "utf8");
if (s.includes("/* AUTH_NO_ZERO_ID */") || !s.includes("id: 0")) {
  console.log("[patch-auth-no-zero-id] already safe");
  process.exit(0);
}
const re = /if \(localUser\) return role === 'admin' && localUser\.role !== 'admin' \? \{ \.\.\.localUser, role: 'admin' \} : localUser;[\s\S]*?return \{[\s\S]*?id: 0,[\s\S]*?\} as User;\n\}/;
const neu = `if (localUser) return role === 'admin' && localUser.role !== 'admin' ? { ...localUser, role: 'admin' } : localUser;
  /* AUTH_NO_ZERO_ID — never use id:0 (breaks saved_quotes FK) */
  console.warn('[Auth] Local user row missing after upsert for', openId);
  return null;
}`;
if (!re.test(s)) {
  console.error("[patch-auth-no-zero-id] pattern not found");
  process.exit(1);
}
s = s.replace(re, neu);
fs.writeFileSync(f, s);
console.log("[patch-auth-no-zero-id] applied");
