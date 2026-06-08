import { Leaderboard } from '../../../lib/storage.js';

// ── In-memory cache ────────────────────────────────────────────────
const _cache   = {};
const CACHE_TTL_MS = 60_000; // 60 detik

/**
 * Fetch leaderboard dari endpoint eksternal (mode Pull).
 *
 * Format URL yang dibangun:
 *   https://www.shadowyn.id/api/leaderboard?board=money&limit=10
 *
 * LEADERBOARD_ENDPOINT = https://www.shadowyn.id/api/leaderboard
 * Opsional: LEADERBOARD_BOARD_BALANCE=money  (alias jika nama board beda)
 */
async function fetchFromEndpoint(board, limit = 10) {
  // Base URL — strip trailing slash & query string lama jika ada
  const raw  = (process.env.LEADERBOARD_ENDPOINT || '').trim();
  const base = raw.split('?')[0].replace(/\/$/, '');
  if (!base) return null;

  const cacheKey = `${board}:${limit}`;
  const now      = Date.now();
  if (_cache[cacheKey] && now - _cache[cacheKey].ts < CACHE_TTL_MS) {
    return _cache[cacheKey].data;
  }

  // Opsional board alias: LEADERBOARD_BOARD_BALANCE=money
  const boardAlias =
    process.env[`LEADERBOARD_BOARD_${board.toUpperCase()}`] || board;

  // Bangun URL persis seperti: ?board=money&limit=10
  const url = `${base}?board=${encodeURIComponent(boardAlias)}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept':       'application/json',
        'X-Server-Key': process.env.PLUGIN_SERVER_KEY || '',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const raw = await res.json();

    // Normalise berbagai format response:
    // { success, entries: [{rank,player,value}] }
    // { board,   entries: [...] }
    // { data:    [...] }
    // [ {rank,player,value}, ... ]  ← array langsung
    let entries = [];
    if (Array.isArray(raw))              entries = raw;
    else if (Array.isArray(raw.entries)) entries = raw.entries;
    else if (Array.isArray(raw.data))    entries = raw.data;

    const normalized = entries.slice(0, 50).map((e, idx) => ({
      rank:   parseInt(e.rank || e.position || idx + 1) || idx + 1,
      player: String(e.player || e.username || e.name || ''),
      score:  Number(e.value ?? e.score ?? e.amount ?? 0),
    }));

    // Simpan lokal sebagai fallback jika endpoint mati
    if (normalized.length > 0) {
      try { Leaderboard.setBoard(board, normalized); } catch {}
    }

    _cache[cacheKey] = { ts: now, data: normalized };
    return normalized;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const board = req.query.board || 'balance';
  const limit = parseInt(req.query.limit || '10');

  // 1. Pull dari LEADERBOARD_ENDPOINT jika dikonfigurasi
  const pulled = await fetchFromEndpoint(board, limit);

  let entries, source;

  if (pulled !== null) {
    entries = pulled;           // limit sudah diterapkan saat fetch
    source  = 'plugin-endpoint';
  } else {
    // 2. Fallback: data push dari plugin (tersimpan lokal)
    const lb = Leaderboard.get();
    entries  = (lb[board] || []).slice(0, limit);
    source   = 'local-storage';
  }

  const lb     = Leaderboard.get();
  const boards = ['balance','auraskills','votes','playtime','playerpoints']
    .filter(b => (lb[b] || []).length > 0);

  res.setHeader('Cache-Control', 'public,s-maxage=30');
  return res.json({
    success: true,
    board,
    entries,
    availableBoards: boards,
    lastSync: lb.lastSync?.[board] || null,
    source,
    endpointConfigured: !!raw,
  });
}
