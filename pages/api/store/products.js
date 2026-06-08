/**
 * /api/store/products — Public endpoint untuk Store page
 * Mengembalikan produk aktif beserta info kategori
 */
import { Products, Categories } from '../../../lib/storage.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const categories = Categories.active().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const allProds   = Products.active().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const products   = allProds.map(p => {
      const cat = Categories.byId(p.category_id);
      return { ...p, category_name: cat?.name || null, category_slug: cat?.slug || null, category_icon: cat?.icon || null };
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: true, products, categories });
  } catch (e) {
    console.error('[api/store/products]', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}
