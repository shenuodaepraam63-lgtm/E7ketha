/** Anonymous visitor id — no PII, localStorage only. */
const KEY = 'e7k_vid_v1';

function randomId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(KEY);
    if (id && /^[a-f0-9]{16,64}$/i.test(id)) return id;
    id = randomId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return randomId();
  }
}
