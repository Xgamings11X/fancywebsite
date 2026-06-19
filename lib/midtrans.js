// lib/midtrans.js
const isProd  = () => (process.env.MIDTRANS_ENV || process.env.NEXT_PUBLIC_MIDTRANS_ENV) === 'production';
const BASE    = () => isProd() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
const API_BASE = () => isProd() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
const AUTH    = () => 'Basic ' + Buffer.from((process.env.MIDTRANS_SERVER_KEY||'') + ':').toString('base64');

export async function createSnapTransaction({ orderId, amount, playerUsername, productName }) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id';
  const res = await fetch(`${BASE()}/snap/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details:    { first_name: playerUsername, email: `${playerUsername}@fancynet.my.id` },
      item_details: [{ id: orderId, price: amount, quantity: 1, name: productName.substring(0,50) }],
      enabled_payments: ['qris','gopay','bank_transfer','shopeepay'],
      expiry: { unit: 'hours', duration: 24 },
      callbacks: {
        finish:  `${siteUrl}/store?order=${orderId}&status=success`,
        error:   `${siteUrl}/store?order=${orderId}&status=error`,
        pending: `${siteUrl}/store?order=${orderId}&status=pending`,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_messages?.join(', ') || 'Midtrans error');
  return { snapToken: data.token, redirectUrl: data.redirect_url };
}

export async function verifyWebhookSignature({ order_id, status_code, gross_amount, signature_key }) {
  const { createHash } = await import('crypto');
  const key  = process.env.MIDTRANS_SERVER_KEY || '';
  const hash = createHash('sha512').update(order_id+status_code+gross_amount+key).digest('hex');
  return hash === signature_key;
}

/**
 * Cek status transaksi langsung ke Midtrans Core API (GET /v2/{order_id}/status).
 * Dipakai sebagai FALLBACK polling di /api/orders/verify/[orderId] kalau
 * notifikasi webhook belum/gagal masuk. Response-nya berisi field yang sama
 * (order_id, status_code, gross_amount, signature_key, transaction_status, dst)
 * jadi bisa langsung diteruskan ke verifyWebhookSignature() / parseTransactionStatus().
 */
export async function getTransactionStatus(orderId) {
  const res  = await fetch(`${API_BASE()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: AUTH() },
  });
  const data = await res.json();
  // status_code 404 = transaksi belum/tidak ada di Midtrans, bukan error fatal
  if (!res.ok && data?.status_code !== '404') {
    throw new Error(data?.status_message || 'Gagal mengambil status transaksi Midtrans');
  }
  return data;
}

export function parseTransactionStatus({ transaction_status, fraud_status, payment_type }) {
  let status = 'pending';
  if (transaction_status === 'capture')    status = fraud_status==='accept' ? 'paid' : 'failed';
  else if (transaction_status === 'settlement') status = 'paid';
  else if (['cancel','deny','refund'].includes(transaction_status)) status = 'failed';
  else if (transaction_status === 'expire') status = 'expired';
  return { status, paymentType: payment_type };
}
