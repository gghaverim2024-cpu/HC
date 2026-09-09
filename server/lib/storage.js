import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxxxxxxx.r2.dev

const useR2 = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL);

// Lazily import the AWS SDK only when R2 is actually configured, so local
// dev without R2 env vars never needs the dependency to be resolvable.
let s3Client = null;
async function getS3() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return s3Client;
}

export const storageMode = useR2 ? 'cloudflare-r2' : 'local-disk-ephemeral';
if (!useR2) {
  console.log('⚠️  R2 לא מוגדר — קבצים שיועלו (תמונות/רילס) יישמרו בדיסק מקומי ויימחקו בכל restart.');
}

// Uploads a buffer and returns its final public URL. Falls back to writing
// on local disk (relative /uploads/<filename> URL) when R2 isn't configured.
export async function uploadBuffer(buffer, filename, contentType) {
  if (useR2) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3();
    await client.send(
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: filename, Body: buffer, ContentType: contentType })
    );
    return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;
  }
  const fullPath = path.join(uploadsDir, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${filename}`;
}
