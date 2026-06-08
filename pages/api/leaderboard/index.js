/**
 * /api/leaderboard
 *
 * GET  ?board=<name>&limit=<n>
 *   → Baca dari storage lokal (data yang sudah di-push plugin)
 *
 * POST (dari plugin Minecraft)
 *   Body: { board: "money"|"auraskills"|"votes"|"playtime"|"playerpoints", entries: [{rank,player,value},...] }
 *   Plugin config: endpoint: https://www.fancynet.my.id/api/leaderboard
 *
 * Mapping board plugin → web:
 *   money        → balance   (ditampilkan sebagai "Top Balance")
 *   auraskills   → auraskills
 *   votes        → votes
 *   playtime     → playtime
 *   playerpoints → playerpoints
 */
import { Leaderboard } from '../../../lib/storage.js';

// Board alias: nama yang dikirim plugin → nama internal web
const BOARD_ALIAS = {
  money:       'balance',
  balance:     'balance',
  auraskills:  'auraskills',
  votes:       'votes',
  playtime:    'playtime',
  playerpoints:'playerpoints',
};

const VALID_BOARDS = ['balance','auraskills','votes','playtime','playerpoints'];

export default async function handler(req, res) {

  // ── POST: plugin push data ──────────────────────────────────
  if (req.method === 'POST') {
    // Opsional auth — jika PLUGIN_SERVER_KEY di-set, validasi
    const key      = req.headers['x-server-key'] || req.headers['authorization']?.replace('Bearer ','') || req.body?.secret || '';
    const expected = (process.env.PLUGIN_SERVER_KEY || '').trim();
    if (expected && key !== expected) {
      return res.status(403).json({ success:false, error:'Invalid server key' });
    }

    const { board: rawBoard, entries } = req.body || {};
    if (!rawBoard || !Array.isArray(entries)) {
      return res.status(400).json({ success:false, error:'"board" dan "entries" wajib diisi' });
    }

    const board = BOARD_ALIAS[rawBoard.toLowerCase()];
    if (!board) {
      return res.status(400).json({ success:false, error:`Board tidak dikenal: ${rawBoard}. Gunakan: ${Object.keys(BOARD_ALIAS).join(', ')}` });
    }

    try {
      const normalized = entries.slice(0, 50).map((e, idx) => ({
        rank:   parseInt(e.rank || e.position || idx + 1) || idx + 1,
        player: String(e.player || e.username || e.name || ''),
        score:  Number(e.value ?? e.score ?? e.amount ?? 0),
      })).filter(e => e.player); // buang entry tanpa nama

      Leaderboard.setBoard(board, normalized);

      console.log(`[leaderboard] push OK — board=${rawBoard}→${board}, entries=${normalized.length}`);
      return res.status(200).json({ success:true, board, received: normalized.length });
    } catch(e) {
      console.error('[leaderboard] push error:', e.message);
      return res.status(500).json({ success:false, error: e.message });
    }
  }

  // ── GET: frontend baca data ─────────────────────────────────
  if (req.method === 'GET') {
    const rawBoard = req.query.board || 'balance';
    const board    = BOARD_ALIAS[rawBoard.toLowerCase()] || rawBoard;
    const limit    = Math.min(parseInt(req.query.limit || '10'), 50);

    const lb      = Leaderboard.get();
    const entries = (lb[board] || []).slice(0, limit);

    const availableBoards = VALID_BOARDS.filter(b => (lb[b] || []).length > 0);

    res.setHeader('Cache-Control', 'no-store'); // data push bisa berubah kapan saja
    return res.json({
      success:  true,
      board,
      entries,
      availableBoards,
      lastSync: lb.lastSync?.[board] || null,
      source:   'plugin-push',
      endpointConfigured: true,
    });
  }

  return res.status(405).end();
}
