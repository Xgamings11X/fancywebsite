/**
 * lib/redis.js — Universal async storage (Redis-first, file-fallback)
 *
 * SETUP VERCEL:
 *   Dashboard → Storage → Create → Upstash KV
 *   Klik "Connect to Project" → auto inject env vars
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * Semua entity (Products, Categories, Orders, dll) tersimpan di Redis
 * sehingga data TIDAK hilang saat redeploy / cold start Vercel.
 */
import { readData, writeData } from './storage.js';

let _redis = null;

export function getRedis() {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    // Dynamic require supaya tidak error jika belum install di lokal
    const { Redis } = require('@upstash/redis');
    _redis = new Redis({ url, token });
  } catch (e) {
    console.warn('[redis] @upstash/redis unavailable, using file storage:', e.message);
  }
  return _redis;
}

export const hasRedis = () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// ── Generic KV helpers ───────────────────────────────────────────
async function kvGet(redisKey, fallbackFile, defaultVal) {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get(redisKey);
      if (val !== null && val !== undefined) {
        return typeof val === 'string' ? JSON.parse(val) : val;
      }
      // Redis kosong — coba seed dari file (migrasi pertama kali)
      const fileData = readData(fallbackFile);
      if (fileData && !(Array.isArray(fileData) && fileData.length === 0)) {
        await r.set(redisKey, JSON.stringify(fileData));
        return fileData;
      }
      return defaultVal;
    } catch (e) {
      console.error(`[redis] get ${redisKey}:`, e.message);
    }
  }
  return readData(fallbackFile) ?? defaultVal;
}

async function kvSet(redisKey, fallbackFile, val) {
  const r = getRedis();
  if (r) {
    try {
      await r.set(redisKey, JSON.stringify(val));
      return;
    } catch (e) {
      console.error(`[redis] set ${redisKey}:`, e.message);
    }
  }
  writeData(fallbackFile, val);
}

// ── Settings ─────────────────────────────────────────────────────
export const SettingsAsync = {
  async get()       { return kvGet('settings', 'settings.json', {}); },
  async set(patch)  {
    const s = await SettingsAsync.get();
    await kvSet('settings', 'settings.json', { ...s, ...patch });
  },
  async getKey(key, fallback = '') {
    return (await SettingsAsync.get())[key] ?? fallback;
  },
};

// ── Categories ───────────────────────────────────────────────────
export const CategoriesAsync = {
  async all()        { return kvGet('categories', 'categories.json', []); },
  async save(cats)   { await kvSet('categories', 'categories.json', cats); },
  async active()     { return (await CategoriesAsync.all()).filter(c => c.is_active === true || c.is_active === 1); },
  async byId(id)     { return (await CategoriesAsync.all()).find(c => c.id === parseInt(id)); },
  async nextId()     { const a = await CategoriesAsync.all(); return a.length ? Math.max(...a.map(c=>c.id))+1 : 1; },
  async add(cat) {
    const cats = await CategoriesAsync.all();
    const newCat = { ...cat, id: await CategoriesAsync.nextId(), is_active: true, created_at: new Date().toISOString() };
    cats.push(newCat);
    await CategoriesAsync.save(cats);
    return newCat;
  },
  async update(id, patch) {
    const cats = (await CategoriesAsync.all()).map(c => c.id===parseInt(id) ? { ...c, ...patch } : c);
    await CategoriesAsync.save(cats);
  },
  async remove(id) {
    await CategoriesAsync.save((await CategoriesAsync.all()).filter(c => c.id !== parseInt(id)));
  },
};

// ── Products ─────────────────────────────────────────────────────
export const ProductsAsync = {
  async all()       { return kvGet('products', 'products.json', []); },
  async save(ps)    { await kvSet('products', 'products.json', ps); },
  async active()    { return (await ProductsAsync.all()).filter(p => p.is_active === true || p.is_active === 1); },
  async byId(id)    { return (await ProductsAsync.all()).find(p => p.id === parseInt(id)); },
  async nextId()    { const a = await ProductsAsync.all(); return a.length ? Math.max(...a.map(p=>p.id))+1 : 1; },
  async add(prod) {
    const prods = await ProductsAsync.all();
    const slug  = prod.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
    const newP  = { ...prod, id: await ProductsAsync.nextId(), slug, is_active: true, created_at: new Date().toISOString() };
    prods.push(newP);
    await ProductsAsync.save(prods);
    return newP;
  },
  async update(id, patch) {
    const prods = (await ProductsAsync.all()).map(p =>
      p.id===parseInt(id) ? { ...p, ...patch, updated_at: new Date().toISOString() } : p);
    await ProductsAsync.save(prods);
  },
  async remove(id) {
    await ProductsAsync.save((await ProductsAsync.all()).filter(p => p.id !== parseInt(id)));
  },
};

// ── Orders ───────────────────────────────────────────────────────
export const OrdersAsync = {
  async all()        { return kvGet('orders', 'orders.json', []); },
  async save(ords)   { await kvSet('orders', 'orders.json', ords); },
  async byId(oid)    { return (await OrdersAsync.all()).find(o => o.order_id === oid); },
  async add(order) {
    const orders = await OrdersAsync.all();
    orders.push({ ...order, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await OrdersAsync.save(orders);
  },
  async update(order_id, patch) {
    const orders = (await OrdersAsync.all()).map(o =>
      o.order_id===order_id ? { ...o, ...patch, updated_at: new Date().toISOString() } : o);
    await OrdersAsync.save(orders);
  },
  async purchaseCount(username, productId, scope='per_product', categoryId=null) {
    const ords = (await OrdersAsync.all()).filter(o => o.payment_status==='success' && o.player_username===username);
    if (scope==='per_product')  return ords.filter(o => o.product_id===parseInt(productId)).length;
    if (scope==='per_category') return ords.filter(o => o.category_id===parseInt(categoryId)).length;
    return ords.length;
  },
};

// ── RedeemCodes ──────────────────────────────────────────────────
export const RedeemCodesAsync = {
  async all()      { return kvGet('redeem_codes', 'redeem_codes.json', []); },
  async save(rcs)  { await kvSet('redeem_codes', 'redeem_codes.json', rcs); },
  async byCode(c)  { return (await RedeemCodesAsync.all()).find(r => r.code.toUpperCase()===c.toUpperCase()); },
  async nextId()   { const a = await RedeemCodesAsync.all(); return a.length ? Math.max(...a.map(r=>r.id))+1 : 1; },
  async add(rc) {
    const all = await RedeemCodesAsync.all();
    all.push({ ...rc, id: await RedeemCodesAsync.nextId(), used_count: 0, created_at: new Date().toISOString() });
    await RedeemCodesAsync.save(all);
  },
  async increment(code) {
    await RedeemCodesAsync.save((await RedeemCodesAsync.all()).map(r =>
      r.code.toUpperCase()===code.toUpperCase() ? { ...r, used_count:(r.used_count||0)+1 } : r
    ));
  },
};

// ── Leaderboard ──────────────────────────────────────────────────
export const LeaderboardAsync = {
  async get()       { return kvGet('leaderboard', 'leaderboard.json', { balance:[], auraskills:[], votes:[], lastSync:{} }); },
  async board(name) { return (await LeaderboardAsync.get())[name] || []; },
  async setBoard(name, entries) {
    const lb = await LeaderboardAsync.get();
    lb.lastSync = lb.lastSync || {};
    if (Array.isArray(entries) && entries.length > 0) {
      lb[name] = entries;
      lb.lastSync[name] = new Date().toISOString();
    } else {
      lb.lastSync[name + '_attempted'] = new Date().toISOString();
    }
    await kvSet('leaderboard', 'leaderboard.json', lb);
  },
};

// ── Tickets (individual keys for performance) ────────────────────
const TICKET_PFX   = 'ticket:';
const TICKETS_IDX  = 'tickets_index';
const EVENT_KEY    = (tid) => `ticket_event:${tid}`;

export const TicketsAsync = {
  async all() {
    const r = getRedis();
    if (r) {
      try {
        const ids = await r.smembers(TICKETS_IDX);
        if (!ids || ids.length === 0) return [];
        const pipe = r.pipeline();
        ids.forEach(id => pipe.get(`${TICKET_PFX}${id}`));
        const rows = await pipe.exec();
        return rows
          .map(item => typeof item === 'string' ? JSON.parse(item) : item)
          .filter(Boolean)
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      } catch (e) { console.error('[redis] tickets.all:', e.message); }
    }
    return readData('support_tickets.json');
  },

  async byId(ticket_id) {
    const r = getRedis();
    if (r) {
      try {
        const raw = await r.get(`${TICKET_PFX}${ticket_id}`);
        if (!raw) return null;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) { console.error('[redis] tickets.byId:', e.message); }
    }
    return (readData('support_tickets.json')).find(t => t.ticket_id === ticket_id) || null;
  },

  async add(ticket) {
    const newT = {
      ...ticket,
      status: 'open',
      messages: ticket.messages || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const r = getRedis();
    if (r) {
      try {
        await r.set(`${TICKET_PFX}${newT.ticket_id}`, JSON.stringify(newT));
        await r.sadd(TICKETS_IDX, newT.ticket_id);
        return newT;
      } catch (e) { console.error('[redis] tickets.add:', e.message); }
    }
    const all = readData('support_tickets.json');
    all.push(newT);
    writeData('support_tickets.json', all);
    return newT;
  },

  async update(ticket_id, patch) {
    const r = getRedis();
    if (r) {
      try {
        const raw = await r.get(`${TICKET_PFX}${ticket_id}`);
        if (!raw) return null;
        const ticket  = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const updated = { ...ticket, ...patch, updated_at: new Date().toISOString() };
        await r.set(`${TICKET_PFX}${ticket_id}`, JSON.stringify(updated));
        await r.set(EVENT_KEY(ticket_id), Date.now().toString());
        return updated;
      } catch (e) { console.error('[redis] tickets.update:', e.message); }
    }
    const all = readData('support_tickets.json').map(t =>
      t.ticket_id === ticket_id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t);
    writeData('support_tickets.json', all);
  },

  async addMessage(ticket_id, message) {
    const msg = { ...message, created_at: new Date().toISOString() };
    const r = getRedis();
    if (r) {
      try {
        const raw = await r.get(`${TICKET_PFX}${ticket_id}`);
        if (!raw) return null;
        const ticket  = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const msgs    = Array.isArray(ticket.messages) ? ticket.messages : [];
        const updated = { ...ticket, messages: [...msgs, msg], updated_at: new Date().toISOString() };
        await r.set(`${TICKET_PFX}${ticket_id}`, JSON.stringify(updated));
        await r.set(EVENT_KEY(ticket_id), Date.now().toString());
        return updated;
      } catch (e) { console.error('[redis] tickets.addMessage:', e.message); }
    }
    const all = readData('support_tickets.json').map(t => {
      if (t.ticket_id !== ticket_id) return t;
      return { ...t, messages: [...(t.messages||[]), msg], updated_at: new Date().toISOString() };
    });
    writeData('support_tickets.json', all);
  },

  async delete(ticket_id) {
    const r = getRedis();
    if (r) {
      try {
        await r.del(`${TICKET_PFX}${ticket_id}`);
        await r.srem(TICKETS_IDX, ticket_id);
        await r.del(EVENT_KEY(ticket_id));
        return;
      } catch (e) { console.error('[redis] tickets.delete:', e.message); }
    }
    const all = readData('support_tickets.json').filter(t => t.ticket_id !== ticket_id);
    writeData('support_tickets.json', all);
  },

  async byPlayer(username) { return (await TicketsAsync.all()).filter(t => t.player_username === username); },

  async countToday(username) {
    const cutoff = new Date(Date.now() - 86400000).toISOString();
    return (await TicketsAsync.all()).filter(t => t.player_username === username && t.created_at > cutoff).length;
  },

  async getLastEventTime(ticket_id) {
    const r = getRedis();
    if (r) {
      try { const ts = await r.get(EVENT_KEY(ticket_id)); return ts ? parseInt(ts) : 0; }
      catch { return 0; }
    }
    const tk = await TicketsAsync.byId(ticket_id);
    return tk ? new Date(tk.updated_at).getTime() : 0;
  },
};
