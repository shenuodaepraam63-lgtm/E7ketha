import crypto from 'node:crypto';
import { ENV } from './_core/env';

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

function readConfig(): CloudinaryConfig | null {
  const value = ENV.cloudinaryUrl;
  if (!value) return null;
  const match = value.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return { apiKey: decodeURIComponent(match[1]), apiSecret: decodeURIComponent(match[2]), cloudName: match[3] };
}

export async function uploadNovelCover(dataUrl: string, filename: string) {
  const config = readConfig();
  if (!config) throw new Error('Cloudinary is not configured');
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = filename.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `cover-${timestamp}`;
  const signatureBase = `folder=riwaya/covers&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const body = new FormData();
  body.set('file', dataUrl);
  body.set('api_key', config.apiKey);
  body.set('timestamp', String(timestamp));
  body.set('folder', 'riwaya/covers');
  body.set('public_id', publicId);
  body.set('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: 'POST', body });
  const result = await response.json() as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? 'Cloudinary upload failed');
  return { url: result.secure_url, publicId: result.public_id ?? publicId };
}
