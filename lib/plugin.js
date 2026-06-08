/**
 * lib/plugin.js — ShadowynAPI Bridge (HTTP only, port 12025)
 *
 * Endpoint plugin yang dipakai website:
 *   GET  /api/ping                    → health check
 *   POST /api/transaction             → eksekusi 1 transaksi
 *   POST /api/products                → batch transaksi
 *   POST /api/check-player            → cek player + rank (juga bisa GET ?name=)
 *   GET  /api/player?name=<player>    → info lengkap player dari player.yml
 */

function pluginUrl() { return (process.env.PLUGIN_HTTP_URL || '').replace(/\/$/, ''); }
function serverKey() { return process.env.PLUGIN_SERVER_KEY || ''; }

async function http(path, options = {}) {
  const base = pluginUrl();
  if (!base) throw new Error('PLUGIN_HTTP_URL belum diset di .env.local');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Key': serverKey(),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Plugin HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

/** GET /api/ping → { status: "ok", ... } */
export async function pingPlugin() {
  try   { const d = await http('/api/ping'); return { ok: true, ...d }; }
  catch (e) { return { ok: false, error: e.message }; }
}

/**
 * POST /api/check-player  { username }
 * → { exists: true, username: "Steve", rank: "vipplus" }
 *
 * Juga coba GET /api/check-player?name=Steve sebagai fallback
 */
export async function checkPlayer(username) {
  try {
    // Coba POST dulu
    const data = await http('/api/check-player', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    return { ok: true, ...data };
  } catch (e) {
    // Fallback ke GET
    try {
      const base = pluginUrl();
      if (!base) return { ok: false, error: 'PLUGIN_HTTP_URL belum diset' };
      const res = await fetch(
        `${base}/api/check-player?name=${encodeURIComponent(username)}`,
        { headers: { 'X-Server-Key': serverKey() }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { ok: true, ...data };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}

/**
 * GET /api/player?name=<player>
 * → { found, uuid, name, online, rank, first_join, last_seen, pending_transactions }
 */
export async function getPlayerInfo(name) {
  try {
    const base = pluginUrl();
    if (!base) return { ok: false, error: 'PLUGIN_HTTP_URL belum diset' };
    const res = await fetch(
      `${base}/api/player?name=${encodeURIComponent(name)}`,
      { headers: { 'X-Server-Key': serverKey() }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * POST /api/transaction — eksekusi 1 transaksi
 * Body: { order_id, player_name, player_uuid, product_id, amount, status, timestamp }
 * → { success, queued, message }
 */
export async function notifyTransaction(payload) {
  try {
    const data = await http('/api/transaction', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * POST /api/products — batch transaksi
 * Body: { transactions: [{ order_id, player_name, player_uuid, product_id, amount }] }
 * → { success, executed, failed }
 */
export async function notifyTransactionBatch(transactions) {
  try {
    const data = await http('/api/products', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
