export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const url = process.env.MC_STATUS_URL;
  if (!url) return res.json({ online:false, players:0, maxPlayers:0, version:'', reason:'MC_STATUS_URL belum diset' });
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000), headers:{'User-Agent':'FancyNetwork/1.0'} });
    const d = await r.json();
    let online=false, players=0, maxPlayers=0, version='';
    if ('online' in d) { online=d.online===true; players=d.players?.online||0; maxPlayers=d.players?.max||0; version=d.version||''; }
    else if ('status' in d) { online=d.status==='online'; players=parseInt(d.players)||0; maxPlayers=parseInt(d.max)||0; version=d.version?.name||d.version||''; }
    res.setHeader('Cache-Control','public,s-maxage=30');
    return res.json({ online, players, maxPlayers, version });
  } catch(e) {
    return res.json({ online:false, players:0, maxPlayers:0, version:'', reason:e.message });
  }
}
