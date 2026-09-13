import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)('Supabase PostgreSQL connection', () => {
  it('connects through the configured session pooler', async () => {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000 });
    try {
      const result = await pool.query<{ ok: number }>('select 1 as ok');
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end();
    }
  }, 20_000);
});
