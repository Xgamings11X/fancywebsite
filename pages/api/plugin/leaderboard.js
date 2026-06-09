import { LeaderboardAsync } from '../../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const key = req.headers['x-server-key'] || req.body?.secret || '';
  const expected = process.env.PLUGIN_SERVER_KEY || '';
  if (expected && key !== expected) return res.status(403).json({ error:'Invalid server key' });

  const { board, entries } = req.body || {};
  if (!board || !Array.isArray(entries))
    return res.status(400).json({ error:'"board" dan "entries" diperlukan' });
  const valid = ['balance','auraskills','votes','playtime','playerpoints','skills','money'];
  if (!valid.includes(board)) return res.status(400).json({ error:`Board harus: ${valid.join(', ')}` });

  try {
    await LeaderboardAsync.setBoard(board, entries.slice(0,50).map(e=>({
      rank: parseInt(e.rank)||0, player: String(e.player||''), score: Number(e.value||0),
    })));
    return res.json({ success:true, received: entries.length });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
