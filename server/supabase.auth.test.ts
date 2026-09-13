import { describe, expect, it } from 'vitest';
import { ENV } from './_core/env';
import { authenticateSupabaseToken } from './_core/supabaseAuth';

describe('Supabase Auth admin configuration', () => {
  it('loads the configured admin email allowlist without exposing its value', () => {
    const emails = new Set(ENV.supabaseAdminEmails.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
    expect(emails).toBeInstanceOf(Set);
    expect([...emails].every((email) => email.includes('@'))).toBe(true);
  });

  it('rejects an invalid Supabase access token', async () => {
    await expect(authenticateSupabaseToken('invalid-token')).resolves.toBeNull();
  });
});
