/**
 * supabaseStorageService.js
 * Backend Supabase Storage Utility for Media and Voice Audio Files
 */

const SUPABASE_BASE = process.env.SUPABASE_URL || 'https://mucgmzldgvtblmsurtgo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1';
const DEFAULT_BUCKET = 'omniflow-vault';

export async function uploadBufferToSupabaseStorage({
  bucket = DEFAULT_BUCKET,
  filePath,
  buffer,
  contentType = 'application/octet-stream'
}) {
  if (!filePath || !buffer) {
    throw new Error('filePath and buffer are required');
  }

  const cleanBase = SUPABASE_BASE.replace(/\/rest\/v1\/?$/, '');
  const uploadUrl = `${cleanBase}/storage/v1/object/${bucket}/${filePath}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: buffer
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase Storage upload failed (HTTP ${res.status}): ${text}`);
  }

  return `${cleanBase}/storage/v1/object/public/${bucket}/${filePath}`;
}

export default {
  uploadBufferToSupabaseStorage
};
