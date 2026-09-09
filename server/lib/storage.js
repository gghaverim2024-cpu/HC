import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Generic S3-compatible object storage. Works with any provider that speaks
// the S3 API — Backblaze B2 (https://s3.<region>.backblazeb2.com), Cloudflare
// R2 (https://<account-id>.r2.cloudflarestorage.com), MinIO, Wasabi, AWS S3 —
// by pointing S3_ENDPOINT at that provider's endpoint URL.
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL; // e.g. https://pub-xxxxxxxx.r2.dev or https://f004.backblazeb2.com/file/<bucket>

const useS3 = !!(
  S3_ENDPOINT &&
  S3_ACCESS_KEY_ID &&
  S3_SECRET_ACCESS_KEY &&
  S3_BUCKET &&
  S3_PUBLIC_URL
);

// Lazily import the AWS SDK only when remote storage is actually configured,
// so local dev without the S3_* env vars never needs the dependency to be
// resolvable.
let s3Client = null;
async function getS3() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return s3Client;
}

export const storageMode = useS3 ? 's3-compatible' : 'local-disk-ephemeral';
if (!useS3) {
  console.log(
    '⚠️  אחסון אובייקטים (S3/R2/B2) לא מוגדר — קבצים שיועלו (תמונות/רילס) יישמרו בדיסק מקומי ויימחקו בכל restart.'
  );
}

// Uploads a buffer and returns its final public URL. Falls back to writing
// on local disk (relative /uploads/<filename> URL) when object storage isn't
// configured.
export async function uploadBuffer(buffer, filename, contentType) {
  if (useS3) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3();
    await client.send(
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: filename, Body: buffer, ContentType: contentType })
    );
    return `${S3_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;
  }
  const fullPath = path.join(uploadsDir, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${filename}`;
}
