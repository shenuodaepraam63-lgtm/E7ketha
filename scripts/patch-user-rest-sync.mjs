/**
 * On Vercel getDb() is null — upsertUser/getUserByOpenId must use Supabase REST
 * so ctx.user.id is real (not 0) for saved_quotes FK.
 */
import fs from "node:fs";

const f = "server/db.ts";
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, "utf8");
if (s.includes("/* USER_REST_SYNC */")) {
  console.log("[patch-user-rest-sync] already applied");
  process.exit(0);
}

const oldUpsert = `export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');
  const db = await getDb();
  if (!db) return;`;

const newUpsert = `export async function upsertUser(user: InsertUser): Promise<void> {
  /* USER_REST_SYNC */
  if (!user.openId) throw new Error('User openId is required for upsert');
  const db = await getDb();
  if (!db) {
    const payload: Record<string, unknown> = {
      openId: user.openId,
      lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (user.name !== undefined) payload.name = user.name ?? null;
    if (user.email !== undefined) payload.email = user.email ?? null;
    if (user.loginMethod !== undefined) payload.loginMethod = user.loginMethod ?? null;
    if (user.role !== undefined) payload.role = user.role;
    else if (user.openId === ENV.ownerOpenId) payload.role = 'admin';
    await supabaseWrite('users', 'POST', payload, 'on_conflict=openId');
    return;
  }`;

const oldGet = `export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}`;

const newGet = `export async function getUserByOpenId(openId: string) {
  /* USER_REST_SYNC */
  const db = await getDb();
  if (!db) {
    const rows = await supabaseRest<any[]>('users', \`select=*&openId=eq.\${encodeURIComponent(openId)}&limit=1\`);
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: Number(r.id),
      openId: r.openId,
      name: r.name ?? null,
      email: r.email ?? null,
      loginMethod: r.loginMethod ?? null,
      role: r.role === 'admin' ? 'admin' as const : 'user' as const,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      lastSignedIn: r.lastSignedIn ? new Date(r.lastSignedIn) : new Date(),
    };
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}`;

if (!s.includes(oldUpsert)) {
  console.error("[patch-user-rest-sync] upsertUser pattern not found");
  process.exit(1);
}
if (!s.includes(oldGet)) {
  console.error("[patch-user-rest-sync] getUserByOpenId pattern not found");
  process.exit(1);
}
s = s.replace(oldUpsert, newUpsert).replace(oldGet, newGet);
fs.writeFileSync(f, s);
console.log("[patch-user-rest-sync] applied");
