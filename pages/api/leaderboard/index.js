/**
 * /api/leaderboard — GET (frontend) + POST (plugin push)
 * Data disimpan di Redis → tidak hilang saat redeploy / cold start
 */
import { LeaderboardAsync } from '../../../lib/redis.js';

const BOARD_ALIAS = {
  money:'balance', balance:'balance', auraskills:'auraskills',
  votes:'votes', playtime:'playtime', playerpoints:'playerpoints',
};
const VALID_BOARDS = ['balance','auraskills','votes','playtime','playerpoints'];

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const key      = req.headers['x-server-key'] || req.headers['authorization']?.replace('Bearer ','') || req.body?.secret || '';
    const expected = (process.env.PLUGIN_SERVER_KEY || '').trim();
    if (expected && key !== expected) return res.status(403).json({ success:false, error:'Invalid server key' });

    const { board:rawBoard, entries } = req.body || {};
    if (!rawBoard || !Array.isArray(entries)) return res.status(400).json({ success:false, error:'"board" dan "entries" wajib diisi' });
    const board = BOARD_ALIAS[rawBoard.toLowerCase()];
    if (!board) return res.status(400).json({ success:false, error:`Board tidak dikenal: ${rawBoard}` });

    const normalized = entries.slice(0,50).map((e,idx) => ({
      rank:   parseInt(e.rank||e.position||idx+1)||idx+1,
      player: String(e.player||e.username||e.name||''),
      score:  Number(e.value??e.score??e.amount??0),
    })).filter(e => e.player);

    await LeaderboardAsync.setBoard(board, normalized);
    return res.json({ success:true, board, received:normalized.length });
  }

  if (req.method === 'GET') {
    const rawBoard = req.query.board || 'balance';
    const board    = BOARD_ALIAS[rawBoard.toLowerCase()] || rawBoard;
    const limit    = Math.min(parseInt(req.query.limit||'10'), 50);
    const lb       = await LeaderboardAsync.get();
    const entries  = (lb[board]||[]).slice(0,limit);
    const availableBoards = VALID_BOARDS.filter(b => (lb[b]||[]).length > 0);

    res.setHeader('Cache-Control','no-store');
    return res.json({ success:true, board, entries, availableBoards, lastSync:lb.lastSync?.[board]||null });
  }

  return res.status(405).end();
}
