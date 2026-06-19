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

import midtransClient from 'midtrans-client';

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

/**
 * Buat Snap transaction (Charge Transaction) → return { snapToken, redirectUrl }
 *
 * Token ini dipakai di frontend untuk Snap EMBED — yaitu `snap.embed(token, { embedId: '...' })`
 * yang menanam daftar metode pembayaran resmi Midtrans langsung ke dalam <div> di halaman,
 * TANPA pop-up (bukan snap.pay()) dan TANPA UI pembayaran custom (bukan Core API charge).
 *
 * Catatan `enabled_payments`: sengaja TIDAK di-set di sini, supaya Snap otomatis menampilkan
 * semua channel pembayaran yang aktif di Midtrans Dashboard kamu (Settings → Snap Preferences).
 * Kalau mau membatasi metode yang muncul, tinggal tambahkan array di sini, contoh:
 *   enabled_payments: ['gopay', 'qris', 'bni_va', 'permata_va', 'echannel', 'other_va']
 */
export async function createSnapTransaction({ orderId, amount, playerUsername, productName }) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id';
  const res = await fetch(`${SNAP_BASE()}/snap/v1/transactions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details:    { first_name: playerUsername, email: `${playerUsername}@fancynet.my.id` },
      item_details: [{ id: orderId, price: amount, quantity: 1, name: productName.substring(0, 50) }],
      expiry:  { unit: 'hours', duration: 24 },
      callbacks: {
        finish:  `${siteUrl}/invoice/${orderId}`,
        error:   `${siteUrl}/invoice/${orderId}`,
        pending: `${siteUrl}/invoice/${orderId}`,
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

// ═══════════════════════════════════════════════════════════════════════════
// MIDTRANS CORE API — dipakai oleh alur checkout custom (UI selector sendiri).
//
// Endpoint: pages/api/orders/create-core.js
// Frontend: components/CartModal.js (pilih metode) + components/
//           PaymentMethodSelector.js (UI kartu metode pembayaran)
// Library : midtrans-client (resmi, npm) — BUKAN fetch manual.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Daftar key payment_method yang valid dari UI custom kita.
 * Dipakai untuk validasi input di pages/api/orders/create-core.js.
 * Bangun body Core API yang sesungguhnya ada di switch-case chargeCoreTransaction() di bawah.
 */
export const PAYMENT_METHOD_CONFIG = {
  gopay_qris: true,  // QRIS Dinamis
  gopay:      true,  // E-Wallet GoPay
  bni_va:     true,  // Bank Transfer / VA
  bri_va:     true,
  cimb_va:    true,
  permata_va: true,
  mandiri_va: true,  // Mandiri Bill Payment (echannel)
};

// Singleton instance midtrans-client CoreApi — dibuat sekali, dipakai ulang.
let _coreApi = null;
function getCoreApi() {
  if (!_coreApi) {
    _coreApi = new midtransClient.CoreApi({
      isProduction: isProd(),
      serverKey:    process.env.MIDTRANS_SERVER_KEY,
      clientKey:    process.env.MIDTRANS_CLIENT_KEY,
    });
  }
  return _coreApi;
}

/**
 * Charge transaksi via Midtrans Core API (`POST /v2/charge`) menggunakan
 * library resmi `midtrans-client`. TIDAK menghasilkan Snap token — langsung
 * return response charge mentah (qr_string / va_numbers / actions / bill_key, dst)
 * sesuai metode pembayaran yang dipilih user di UI custom.
 *
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {number} opts.amount
 * @param {string} opts.playerUsername
 * @param {string} opts.productName
 * @param {string} opts.paymentMethod  – key dari UI selector: gopay_qris | gopay |
 *                                       bni_va | bri_va | cimb_va | permata_va | mandiri_va
 * @returns {Promise<object>} response body Midtrans Core API (lihat docs.midtrans.com)
 */
export async function chargeCoreTransaction({ orderId, amount, playerUsername, productName, paymentMethod }) {
  const core    = getCoreApi();
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id';

  // Parameter dasar — wajib ada di SETIAP request charge, apa pun metodenya.
  const base = {
    transaction_details: { order_id: orderId, gross_amount: amount },
    customer_details:    { first_name: playerUsername, email: `${playerUsername}@fancynet.my.id` },
    item_details: [{ id: orderId, price: amount, quantity: 1, name: productName.substring(0, 50) }],
  };

  let parameter;

  // ── Switch-case: payment_type & field tambahan dibangun per metode ────────
  switch (paymentMethod) {

    // 1) QRIS Dinamis — payment_type Midtrans-nya 'qris' (acquirer 'gopay'
    //    membuat QR code yang sudah tertanam nominal & berlaku sekali pakai).
    case 'gopay_qris':
      parameter = {
        ...base,
        payment_type: 'qris',
        qris: { acquirer: 'gopay' },
      };
      break;

    // 2) E-Wallet — GoPay (hasilnya: actions[].deeplink-redirect + QR fallback)
    case 'gopay':
      parameter = {
        ...base,
        payment_type: 'gopay',
        gopay: {
          enable_callback: true,
          callback_url:    `${siteUrl}/invoice/${orderId}`,
        },
      };
      break;

    // 3) Bank Transfer / Virtual Account
    case 'bni_va':
      parameter = { ...base, payment_type: 'bank_transfer', bank_transfer: { bank: 'bni' } };
      break;
    case 'bri_va':
      parameter = { ...base, payment_type: 'bank_transfer', bank_transfer: { bank: 'bri' } };
      break;
    case 'cimb_va':
      parameter = { ...base, payment_type: 'bank_transfer', bank_transfer: { bank: 'cimb' } };
      break;
    case 'permata_va':
      parameter = { ...base, payment_type: 'bank_transfer', bank_transfer: { bank: 'permata' } };
      break;

    // 4) Mandiri Bill Payment — payment_type-nya 'echannel' (BUKAN bank_transfer),
    //    hasilnya bill_key + biller_code, bukan va_number.
    case 'mandiri_va':
      parameter = {
        ...base,
        payment_type: 'echannel',
        echannel: {
          bill_info1: 'Pembayaran',
          bill_info2: productName.substring(0, 25),
        },
      };
      break;

    default:
      throw new Error(`Payment method tidak dikenal: ${paymentMethod}`);
  }

  try {
    // midtrans-client otomatis menentukan base URL sandbox/production dari
    // isProduction, dan mengisi header Authorization (Basic Auth server key).
    const chargeResponse = await core.charge(parameter);
    return chargeResponse;
  } catch (e) {
    // midtrans-client melempar error berisi e.ApiResponse (body asli dari Midtrans)
    console.error('[midtrans] core.charge error:', e.ApiResponse || e.message);
    throw new Error(e.ApiResponse?.status_message || e.message || 'Midtrans Core API error');
  }
}

/**
 * Ekstrak info pembayaran (VA number, QR URL, deeplink URL) dari response Core API.
 * @param {object} coreData   — response dari chargeCoreTransaction
 * @param {string} paymentMethod
 * @returns {{ vaNumber?, qrImageUrl?, qrString?, deeplinkUrl?, billKey?, billCode? }}
 */
export function extractPaymentInfo(coreData, paymentMethod) {
  const info = {};

  if (paymentMethod === 'mandiri_va') {
    // Mandiri pakai echannel (bill_key + biller_code), bukan VA biasa
    info.billKey  = coreData.bill_key    || null;
    info.billCode = coreData.biller_code || null;

  } else if (paymentMethod === 'gopay_qris') {
    // QRIS Dinamis via GoPay acquirer
    info.qrImageUrl = coreData.actions?.find(a => a.name === 'generate-qr-code')?.url || null;
    info.qrString   = coreData.qr_string || null;
    info.qrUrl      = info.qrImageUrl || info.qrString || null; // backward-compat

  } else if (paymentMethod === 'gopay') {
    // GoPay: QR + deeplink
    info.qrImageUrl  = coreData.actions?.find(a => a.name === 'generate-qr-code')?.url  || null;
    info.qrString    = coreData.qr_string || null;
    info.qrUrl       = info.qrImageUrl || info.qrString || null;
    info.deeplinkUrl = coreData.actions?.find(a => a.name === 'deeplink-redirect')?.url || null;

  } else {
    // Semua Bank Transfer VA: bni_va, bri_va, cimb_va, permata_va
    info.vaNumber = coreData.va_numbers?.[0]?.va_number
                 || coreData.permata_va_number
                 || coreData.account_number
                 || null;
    // Simpan nama bank dari response agar bisa ditampilkan di invoice
    info.vaBank   = coreData.va_numbers?.[0]?.bank
                 || coreData.payment_type
                 || paymentMethod.replace('_va','').toUpperCase()
                 || null;
  }
  return info;
}
