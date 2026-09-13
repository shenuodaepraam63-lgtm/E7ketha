import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error('SUPABASE_DATABASE_URL is required');
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1 });

try {
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE public.novel_link_type AS ENUM ('read', 'download');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS public."novelLinks" (
      "id" serial PRIMARY KEY NOT NULL,
      "novelId" integer NOT NULL,
      "label" varchar(120) NOT NULL,
      "url" varchar(1000) NOT NULL,
      "type" public.novel_link_type DEFAULT 'read' NOT NULL,
      "displayOrder" integer DEFAULT 0 NOT NULL,
      "createdAt" timestamptz DEFAULT now() NOT NULL,
      "updatedAt" timestamptz DEFAULT now() NOT NULL
    );
  `);
  const result = await pool.query(`select count(*)::int as count from public."novelLinks"`);
  console.log(JSON.stringify({ novelLinksTable: 'ready', rows: result.rows[0]?.count ?? 0 }));
} finally {
  await pool.end();
}
