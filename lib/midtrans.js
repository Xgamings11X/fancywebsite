import midtransClient from 'midtrans-client';

const isProd = () =>
  process.env.MIDTRANS_ENV === 'production' ||
  process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production';

// Singleton instance CoreApi
let _coreApi = null;
function getCoreApi() {
  if (!_coreApi) {
    _coreApi = new midtransClient.CoreApi({
      isProduction: isProd(),
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }
  return _coreApi;
}

export const PAYMENT_METHOD_CONFIG = {
  gopay_qris: true,
  gopay: true,
  bni_va: true,
  bri_va: true,
  cimb_va: true,
  permata_va: true,
  mandiri_va: true,
};

export async function chargeCoreTransaction({ orderId, amount, playerUsername, productName, paymentMethod }) {
  const core = getCoreApi();
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id';

  // MATANG 1: Pastikan amount berupa Integer mutlak
  const safeAmount = Math.round(Number(amount));

  // MATANG 2: Bersihkan spasi dan simbol dari username agar email selalu valid formatnya
  const cleanUsername = playerUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'player';
  const safeEmail = `${cleanUsername}@fancynet.my.id`;

  // Base parameter wajib
  const base = {
    transaction_details: { 
      order_id: orderId, 
      gross_amount: safeAmount 
    },
    customer_details: { 
      first_name: playerUsername.substring(0, 45), // Batasi panjang nama
      email: safeEmail 
    },
    item_details: [{ 
      id: orderId, 
      price: safeAmount, 
      quantity: 1, 
      name: productName.substring(0, 45) 
    }],
    // MATANG 3: Paksa set masa aktif transaksi ke 24 jam agar tidak langsung "tidak aktif"
    custom_expiry: {
      expiry_duration: 24,
      unit: "hour"
    }
  };

  let parameter;

  switch (paymentMethod) {
    case 'gopay_qris':
      parameter = { ...base, payment_type: 'qris', qris: { acquirer: 'gopay' } };
      break;
    case 'gopay':
      parameter = { ...base, payment_type: 'gopay', gopay: { enable_callback: true, callback_url: `${siteUrl}/invoice/${orderId}` } };
      break;
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
      throw new Error(`Metode tidak dikenal: ${paymentMethod}`);
  }

  try {
    return await core.charge(parameter);
  } catch (e) {
    // Memberikan log error yang lebih spesifik jika gagal
    const errorMsg = e.ApiResponse?.status_message || e.message;
    console.error('❌ [Midtrans API Error]:', JSON.stringify(e.ApiResponse || errorMsg, null, 2));
    throw new Error(errorMsg);
  }
}

export function extractPaymentInfo(coreData, paymentMethod) {
  const info = {};
  if (paymentMethod === 'mandiri_va') {
    info.billKey = coreData.bill_key || null;
    info.billCode = coreData.biller_code || null;
  } else if (paymentMethod === 'gopay_qris' || paymentMethod === 'gopay') {
    info.qrImageUrl = coreData.actions?.find(a => a.name === 'generate-qr-code')?.url || null;
    info.qrString = coreData.qr_string || null;
    info.qrUrl = info.qrImageUrl || info.qrString || null;
    if (paymentMethod === 'gopay') {
      info.deeplinkUrl = coreData.actions?.find(a => a.name === 'deeplink-redirect')?.url || null;
    }
  } else {
    // Bank VA
    info.vaNumber = coreData.va_numbers?.[0]?.va_number || coreData.permata_va_number || coreData.account_number || null;
    info.vaBank = coreData.va_numbers?.[0]?.bank || coreData.payment_type || paymentMethod.replace('_va','').toUpperCase();
  }
  return info;
}
