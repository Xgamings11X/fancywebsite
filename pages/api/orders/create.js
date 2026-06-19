import { ProductsAsync, OrdersAsync, RedeemCodesAsync } from '../../../lib/redis.js';
import { createTransaction } from '../../../lib/midtrans.js';
import { verifyToken } from '../../../lib/auth.js';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const t = parse(req.headers.cookie||'').token || req.headers.authorization?.replace('Bearer ','');
  const user = verifyToken(t);
  if (!user || user.type !== 'player') return res.status(401).json({ success:false, message:'Login terlebih dahulu' });

  const { productId, redeemCode, discord_username } = req.body || {};
  if (!productId) return res.status(400).json({ success:false, message:'productId diperlukan' });
  if (!discord_username?.trim()) return res.status(400).json({ success:false, message:'Username Discord wajib diisi untuk klaim role' });

  try {
    const product = await ProductsAsync.byId(productId);
    if (!product || !product.is_active) return res.status(404).json({ success:false, message:'Produk tidak ditemukan' });

    if (!product.reward_trigger?.trim()) {
      return res.status(400).json({ success:false, message:'Produk belum dikonfigurasi (reward_trigger kosong). Hubungi admin.' });
    }

    if (product.purchase_limit > 0) {
      const count = await OrdersAsync.purchaseCount(user.username, product.id, product.limit_scope||'per_product', product.category_id);
      if (count >= product.purchase_limit)
        return res.status(400).json({ success:false, message:`Batas pembelian tercapai (max ${product.purchase_limit}x)` });
    }

    let discountAmount=0, finalPrice=product.price, usedCode=null;
    if (redeemCode) {
      const code = await RedeemCodesAsync.byCode(redeemCode);
      if (!code || !code.is_active)           return res.status(400).json({ success:false, message:'Kode tidak valid' });
      if (code.expires_at && new Date(code.expires_at)<new Date())
                                               return res.status(400).json({ success:false, message:'Kode sudah kadaluarsa' });
      if (code.used_count >= code.max_uses)    return res.status(400).json({ success:false, message:'Kode sudah habis' });
      if (code.product_id && code.product_id !== product.id)
                                               return res.status(400).json({ success:false, message:'Kode tidak berlaku untuk produk ini' });
      discountAmount = code.discount_type==='percent'
        ? Math.floor(product.price*code.discount_value/100) : code.discount_value;
      discountAmount = Math.min(discountAmount, product.price);
      finalPrice     = product.price - discountAmount;
      usedCode       = code.code;
    }

    const orderId   = `FN-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const expiredAt = new Date(Date.now() + 24*60*60*1000).toISOString();

    // Ambil category_name untuk invoice
    let categoryName = '';
    try {
      const { CategoriesAsync } = await import('../../../lib/redis.js');
      const cat = await CategoriesAsync.byId(product.category_id);
      categoryName = cat?.name || '';
    } catch {}

    await OrdersAsync.add({
      order_id: orderId, player_username: user.username, player_uuid: user.uuid||null,
      player_rank: user.rank||null, product_id: product.id, category_id: product.category_id,
      product_name: product.name, category_name: categoryName,
      reward_trigger: product.reward_trigger||null,
      amount: finalPrice, discount_amount: discountAmount, redeem_code: usedCode,
      discord_username: discord_username.trim(),
      payment_status: 'pending', payment_method: 'qris',
      plugin_notified: false, plugin_queued: false,
      expired_at: expiredAt,
    });

    // Buat transaksi Tripay
    const tripay = await createTransaction({
      orderId, amount: finalPrice,
      playerUsername: user.username, productName: product.name,
    });

    await OrdersAsync.update(orderId, {
      tripay_reference: tripay.reference,
      tripay_pay_url:   tripay.payUrl,
      tripay_qr_url:    tripay.qrUrl   || null,
      tripay_pay_code:  tripay.payCode || null,
    });

    if (usedCode) await RedeemCodesAsync.increment(usedCode);

    return res.json({
      success: true,
      orderId,
      payUrl:      tripay.payUrl,
      qrUrl:       tripay.qrUrl    || null,
      payCode:     tripay.payCode  || null,
      reference:   tripay.reference,
      finalPrice,
      discountAmount,
    });
  } catch(e) {
    console.error('[order/create]', e.message);
    return res.status(500).json({ success:false, message: e.message });
  }
}
