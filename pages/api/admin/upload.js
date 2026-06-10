/**
 * pages/api/admin/upload.js
 * ─────────────────────────────────────────────────────────────────
 * Smart upload router — otomatis pilih provider berdasarkan .env:
 *
 *  1. Cloudinary  → jika CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET diset
 *  2. AWS S3      → jika AWS_S3_BUCKET + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY diset
 *  3. Lokal       → fallback ke public/uploads/ (VPS/Pterodactyl)
 *
 * Request body (JSON):
 *   filename  {string}  — nama file asli tanpa ekstensi
 *   type      {string}  — MIME type, misal "image/png"
 *   data      {string}  — base64 dataURL, misal "data:image/png;base64,..."
 *
 * Response:
 *   { success: true,  url: "https://..." }
 *   { success: false, message: "..." }
 *
 * Auth: admin token wajib (cookie atau Authorization header)
 */

import fs   from 'fs';
import path from 'path';
import https from 'https';
import http  from 'http';
import { verifyToken } from '../../../lib/auth.js';
import { parse }       from 'cookie';

export const config = {
  api: { bodyParser: { sizeLimit: '3mb' } },
};

// ─── Auth ────────────────────────────────────────────────────────
function auth(req) {
  const t = parse(req.headers.cookie || '').admin_token
          || req.headers.authorization?.replace('Bearer ', '');
  return verifyToken(t)?.type === 'admin';
}

// ─── Allowed MIME types ───────────────────────────────────────────
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
};

// ══════════════════════════════════════════════════════════════════
// PROVIDER 1 — Cloudinary
// Docs: https://cloudinary.com/documentation/image_upload_api_reference
// Env vars dibutuhkan:
//   CLOUDINARY_CLOUD_NAME  — nama cloud kamu (contoh: "mycloudname")
//   CLOUDINARY_API_KEY     — API Key dari dashboard Cloudinary
//   CLOUDINARY_API_SECRET  — API Secret dari dashboard Cloudinary
//   CLOUDINARY_FOLDER      — (opsional) nama folder di Cloudinary, default: "fancystore"
// ══════════════════════════════════════════════════════════════════
async function uploadToCloudinary(base64Data, mimeType, filename) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder    = process.env.CLOUDINARY_FOLDER || 'fancystore';

  // Buat signature untuk auth (tanpa SDK, pure HTTP)
  const timestamp  = Math.floor(Date.now() / 1000).toString();
  const publicId   = `${folder}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0,40)}`;
  const toSign     = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;

  // SHA-1 signature — pakai crypto bawaan Node.js
  const { createHash } = await import('crypto');
  const signature = createHash('sha1').update(toSign).digest('hex');

  // Build multipart/form-data manual (tidak ada SDK)
  const boundary = `----FancyUpload${Date.now()}`;
  const dataOnly = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Cloudinary menerima base64 langsung via field "file" dengan prefix data URI
  const fields = {
    file:       `data:${mimeType};base64,${dataOnly}`,
    api_key:    apiKey,
    timestamp,
    signature,
    folder,
    public_id:  publicId,
  };

  let body = '';
  for (const [key, val] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
  }
  body += `--${boundary}--\r\n`;

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const resData = await httpPost(url, body, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });

  const json = JSON.parse(resData);
  if (json.error) throw new Error('Cloudinary: ' + json.error.message);

  // Return URL HTTPS langsung dari Cloudinary CDN
  return json.secure_url;
}

// ══════════════════════════════════════════════════════════════════
// PROVIDER 2 — AWS S3 (atau DigitalOcean Spaces, Backblaze B2, dsb)
// Docs: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
// Env vars dibutuhkan:
//   AWS_S3_BUCKET          — nama bucket S3 (contoh: "fancystore-assets")
//   AWS_ACCESS_KEY_ID      — Access Key dari AWS IAM
//   AWS_SECRET_ACCESS_KEY  — Secret Key dari AWS IAM
//   AWS_S3_REGION          — region bucket (contoh: "ap-southeast-1"), default: "us-east-1"
//   AWS_S3_ENDPOINT        — (opsional) custom endpoint untuk non-AWS, misal DigitalOcean Spaces
//                            contoh: "https://sgp1.digitaloceanspaces.com"
//   AWS_S3_PUBLIC_URL      — (opsional) base URL publik, default: https://{bucket}.s3.{region}.amazonaws.com
// ══════════════════════════════════════════════════════════════════
async function uploadToS3(base64Data, mimeType, ext, filename) {
  const bucket    = process.env.AWS_S3_BUCKET;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region    = process.env.AWS_S3_REGION || 'us-east-1';
  const endpoint  = process.env.AWS_S3_ENDPOINT || `https://s3.${region}.amazonaws.com`;
  const publicBase= process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  const { createHmac, createHash } = await import('crypto');

  const safeName  = filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const key       = `uploads/${Date.now()}_${safeName}.${ext}`;
  const dataOnly  = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const fileBuffer = Buffer.from(dataOnly, 'base64');

  // AWS Signature V4
  const now       = new Date();
  const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);  // YYYYMMDD
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, '');              // YYYYMMDDTHHmmssZ
  const host      = new URL(endpoint).hostname;
  const payloadHash = createHash('sha256').update(fileBuffer).digest('hex');

  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders    = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `PUT\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign    = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), 's3'), 'aws4_request');
  const signature  = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const uploadUrl     = `${endpoint}/${bucket}/${key}`;

  await httpPut(uploadUrl, fileBuffer, {
    'Content-Type':          mimeType,
    'x-amz-date':            amzDate,
    'x-amz-content-sha256':  payloadHash,
    'Authorization':          authorization,
  });

  return `${publicBase}/${key}`;
}

// ══════════════════════════════════════════════════════════════════
// PROVIDER 3 — Local filesystem (fallback)
// Simpan ke public/uploads/ → accessible via /uploads/filename
// ══════════════════════════════════════════════════════════════════
function resolveUploadDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return '/tmp/uploads';
  if (fs.existsSync('/home/container')) return path.join('/home/container', 'public', 'uploads');
  if (fs.existsSync('/app'))            return path.join('/app', 'public', 'uploads');
  return path.resolve(process.cwd(), 'public', 'uploads');
}

function uploadToLocal(base64Data, mimeType, ext, filename) {
  const uploadDir = resolveUploadDir();
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const safeName   = filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const uniqueName = `${Date.now()}_${safeName}.${ext}`;
  const filePath   = path.join(uploadDir, uniqueName);
  const dataOnly   = base64Data.replace(/^data:image\/\w+;base64,/, '');

  fs.writeFileSync(filePath, Buffer.from(dataOnly, 'base64'));

  // Vercel: file di /tmp tidak bisa diakses via URL, return base64 dataURL
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? base64Data : `/uploads/${uniqueName}`;
}

// ─── HTTP helpers (pure Node.js, tanpa axios/node-fetch) ──────────
function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = Buffer.from(body, 'utf8');
    const req = lib.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Length': bodyBuf.length, ...headers },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

function httpPut(url, buffer, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'PUT',
      headers:  { 'Content-Length': buffer.length, ...headers },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`S3 error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// ─── Detect active provider ───────────────────────────────────────
function detectProvider() {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    return 'cloudinary';
  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    return 's3';
  return 'local';
}

// ─── Main handler ─────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { filename = 'image', type, data } = req.body || {};

    const ext = ALLOWED[type];
    if (!ext) return res.status(400).json({ success: false, message: 'Format tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.' });

    const dataOnly = (data || '').replace(/^data:image\/\w+;base64,/, '');
    const sizeBytes = Buffer.byteLength(dataOnly, 'base64');
    if (sizeBytes > 3 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Ukuran file maksimal 3MB.' });

    const provider = detectProvider();
    let url;

    if (provider === 'cloudinary') {
      url = await uploadToCloudinary(data, type, filename);
    } else if (provider === 's3') {
      url = await uploadToS3(data, type, ext, filename);
    } else {
      url = uploadToLocal(data, type, ext, filename);
    }

    return res.json({ success: true, url, provider });
  } catch (e) {
    console.error('[upload]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}
