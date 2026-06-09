/**
 * lib/midtrans.js
 *
 * ENV yang diperlukan:
 *   MIDTRANS_SERVER_KEY       = SB-Mid-server-xxx  (sandbox) / Mid-server-xxx  (production)
 *   MIDTRANS_CLIENT_KEY       = SB-Mid-client-xxx  (sandbox) / Mid-client-xxx  (production)
 *   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = sama dengan MIDTRANS_CLIENT_KEY (agar bisa dibaca browser)
 *   MIDTRANS_ENV              = sandbox (default) | production
 *   NEXT_PUBLIC_MIDTRANS_ENV  = sandbox (default) | production (untuk Snap.js URL di browser)
 */

const isProd = () =>
  process.env.MIDTRANS_ENV === 'production' ||
  process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production';

// Snap API base
const SNAP_BASE = () => isProd()
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

// Core API base (transaction status, dll)
const CORE_BASE = () => isProd()
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

const AUTH = () =>
  'Basic ' + Buffer.from((process.env.MIDTRANS_SERVER_KEY || '') + ':').toString('base64');

/** Buat Snap transaction → return { snapToken, redirectUrl } */
export async function createSnapTransaction({ orderId, amount, playerUsername, productName }) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id';
  const res = await fetch(`${SNAP_BASE()}/snap/v1/transactions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details:    { first_name: playerUsername, email: `${playerUsername}@fancynet.my.id` },
      item_details: [{ id: orderId, price: amount, quantity: 1, name: productName.substring(0, 50) }],
      enabled_payments: ['qris', 'gopay', 'bank_transfer', 'shopeepay'],
      expiry:  { unit: 'hours', duration: 24 },
      callbacks: {
        finish:  `${siteUrl}/store?order_id=${orderId}`,
        error:   `${siteUrl}/store?order_id=${orderId}`,
        pending: `${siteUrl}/store?order_id=${orderId}`,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[midtrans] createSnap error:', JSON.stringify(data));
    throw new Error(data.error_messages?.join(', ') || `Midtrans ${res.status}`);
  }
  return { snapToken: data.token, redirectUrl: data.redirect_url };
}

/**
 * Verifikasi signature dari Midtrans webhook
 *
 * Formula: SHA512( order_id + status_code + gross_amount + server_key )
 *
 * Jika MIDTRANS_SKIP_VERIFY=1 di .env → skip verifikasi (hanya untuk testing lokal)
 */
export async function verifyWebhookSignature({ order_id, status_code, gross_amount, signature_key }) {
  // Skip mode untuk lokal dev / ngrok testing
  if (process.env.MIDTRANS_SKIP_VERIFY === '1') {
    console.warn('[midtrans] ⚠️  Signature verification SKIPPED (MIDTRANS_SKIP_VERIFY=1)');
    return true;
  }

  const key = process.env.MIDTRANS_SERVER_KEY || '';
  if (!key) {
    console.error('[midtrans] MIDTRANS_SERVER_KEY belum di-set!');
    return false;
  }

  const { createHash } = await import('crypto');
  const input    = `${order_id}${status_code}${gross_amount}${key}`;
  const computed = createHash('sha512').update(input).digest('hex');

  if (computed !== signature_key) {
    console.error('[midtrans] Signature mismatch!',
      `\n  env    : ${isProd() ? 'PRODUCTION' : 'SANDBOX'}`,
      `\n  key    : ${key.substring(0, 15)}...`,
      `\n  input  : ${input.substring(0, 60)}...`,
      `\n  expect : ${signature_key?.substring(0, 20)}...`,
      `\n  got    : ${computed.substring(0, 20)}...`,
    );
    return false;
  }
  return true;
}

/** Parse status dari Midtrans notification body */
export function parseTransactionStatus({ transaction_status, fraud_status, payment_type }) {
  let status = 'pending';
  if      (transaction_status === 'capture')    status = fraud_status === 'accept' ? 'paid' : 'failed';
  else if (transaction_status === 'settlement') status = 'paid';
  else if (['cancel', 'deny', 'refund'].includes(transaction_status)) status = 'failed';
  else if (transaction_status === 'expire')     status = 'expired';
  return { status, paymentType: payment_type };
}

/** Ambil status transaksi langsung dari Midtrans API (untuk manual check) */
export async function getTransactionStatus(orderId) {
  try {
    const res = await fetch(`${CORE_BASE()}/v2/${orderId}/status`, {
      headers: { Authorization: AUTH() },
      signal:  AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch (e) {
    return { status_code: '500', status_message: e.message };
  }
}
