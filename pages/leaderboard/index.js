import { useState, useEffect } from 'react';
import Head from 'next/head';
// SettingsAsync loaded via dynamic import in getServerSideProps
import FancyNav, { PlayerAvatar } from '../../components/FancyNav';
import { useTransparentLogo } from '../../components/LogoImage';
import LoginModal from '../../components/LoginModal';
import toast from 'react-hot-toast';

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../../lib/redis.js');
    return { props:{ settings: await SettingsAsync.get() } };
  } catch { return { props:{ settings:{} } }; }
}

const BOARDS = {
  balance:      { label:'Top Balance', icon:'fa-coins',         color:'#f1c40f', unit:'Balance' },
  auraskills:   { label:'Top Skills',  icon:'fa-wand-sparkles', color:'#9b59b6', unit:'Level' },
  votes:        { label:'Top Votes',   icon:'fa-star',          color:'var(--primary)', unit:'Vote' },
  playtime:     { label:'Top Playtime',icon:'fa-clock',         color:'#2ecc71', unit:'Jam'   },
  playerpoints: { label:'Top Points',  icon:'fa-gem',           color:'#3498db', unit:'Poin'  },
};

const RANK_COLORS = {1:'var(--gold)', 2:'var(--silver)', 3:'var(--bronze)'};
const RANK_ICONS  = {1:'fa-trophy', 2:'fa-medal', 3:'fa-award'};

function fmtScore(v, unit) {
  const n = Number(v||0);
  if (unit==='Balance' && n>=1000000) return (n/1000000).toFixed(1)+'M';
  if (unit==='Balance' && n>=1000) return (n/1000).toFixed(0)+'K';
  if (n>=1000) return (n/1000).toFixed(1)+'K';
  return n.toLocaleString('id-ID');
}

export default function LeaderboardPage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [active,    setActive]    = useState('balance');
  const [data,      setData]      = useState({});
  const [connMeta,  setConnMeta]  = useState({});  // renamed: connection metadata per board
  const [loading,   setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  useEffect(() => {
    try { const r=localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetchAll();
  }, []);

  const fetchAll = async (quiet=false) => {
    if (!quiet) setLoading(true);
    const results = {};
    const metaMap = {};
    await Promise.all(Object.keys(BOARDS).map(async b => {
      try {
        const r = await fetch(`/api/leaderboard?board=${b}&limit=10`);
        const d = await r.json();
        if (d.success) {
          results[b] = d.entries || [];
          metaMap[b] = { source: d.source, endpointConfigured: d.endpointConfigured };
        }
      } catch {}
    }));
    // BUGFIX: saat refresh (quiet), pertahankan data lama jika data baru kosong
    // Supaya saat sync tidak tiba-tiba kosong karena timing atau instance berbeda
    setData(prev => {
      const merged = { ...prev };
      Object.keys(results).forEach(b => {
        if (results[b].length > 0) {
          merged[b] = results[b];
        }
        // Jika results[b] kosong tapi sebelumnya ada data, pertahankan data lama
      });
      return merged;
    });
    setConnMeta(metaMap);
    setLastFetch(new Date());
    if (!quiet) setLoading(false);
  };

  // Auto-refresh setiap 60 detik
  useEffect(() => {
    const iv = setInterval(() => fetchAll(true), 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player');
    toast.success('Berhasil keluar');
  };

  const board   = BOARDS[active];
  const entries = data[active] || [];

  return (
    <>
      <Head>
        <title>Leaderboard — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Leaderboard ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <div style={{padding:'130px 6% 80px', maxWidth:900, margin:'0 auto'}}>

        {/* ── Header ── */}
        <div style={{textAlign:'center', marginBottom:40}} data-anim="fade-up">
          <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>HALL OF FAME</span>
          <h1 className="font-space" style={{fontSize:'clamp(24px,5vw,36px)',fontWeight:700,marginBottom:14}}>
            Papan <span style={{color:'var(--primary)'}}>Peringkat</span>
          </h1>

          {/* Connection status badge */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'}}>
            {connMeta[active]?.endpointConfigured ? (
              <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(46,204,113,0.1)',border:'1px solid rgba(46,204,113,0.25)',borderRadius:20,padding:'4px 14px',fontSize:12,color:'#2ecc71',fontWeight:600}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#2ecc71',display:'inline-block',boxShadow:'0 0 6px #2ecc71'}}/>
                Terhubung ke Plugin Endpoint
              </span>
            ) : (
              <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,200,0,0.08)',border:'1px solid rgba(255,200,0,0.2)',borderRadius:20,padding:'4px 14px',fontSize:12,color:'#f1c40f',fontWeight:600}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#f1c40f',display:'inline-block'}}/>
                Mode Push (plugin kirim data)
              </span>
            )}
            {lastFetch && (
              <span style={{fontSize:11,color:'var(--text-muted)',display:'inline-flex',alignItems:'center',gap:6}}>
                {lastFetch.toLocaleTimeString('id-ID')}
                <button onClick={()=>fetchAll()} style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:11,padding:0,fontWeight:600,display:'inline-flex',alignItems:'center',gap:3}}>
                  <i className="fa-solid fa-rotate"/>Refresh
                </button>
              </span>
            )}
          </div>
        </div>

        {/* ── Board Tabs ──
            - Scrollable horizontally (overflow-x: auto)
            - flex-shrink:0 on buttons so they never squash
            - variable active colour per board
        ── */}
        <div style={{
          overflowX:'auto',
          WebkitOverflowScrolling:'touch',
          marginBottom:32,
          paddingBottom:4,   /* room for scrollbar */
        }}>
          <div style={{
            display:'inline-flex',          /* shrink-wrap content */
            gap:6,
            background:'rgba(15,15,20,0.6)',
            padding:6,
            borderRadius:12,
            border:'1px solid rgba(255,255,255,0.05)',
            minWidth:'100%',                /* at least fill container */
          }}>
            {Object.entries(BOARDS).map(([key, boardMeta]) => {
              const isActive = active === key;
              const col = boardMeta.color;
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  style={{
                    flexShrink: 0,
                    background: isActive ? col : 'transparent',
                    border: 'none',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    padding: '9px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.25s',
                    boxShadow: isActive ? `0 4px 14px ${col}55` : 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <i className={`fa-solid ${boardMeta.icon}`} style={{fontSize:12}}/>
                  {boardMeta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <div className="fn-spinner" style={{width:40,height:40,borderWidth:3,margin:'0 auto 16px'}}/>
            <p style={{color:'var(--text-muted)'}}>Memuat data...</p>
          </div>

        ) : entries.length === 0 ? (
          /* ── Empty state / setup guide ── */
          <div style={{padding:'20px 0'}}>
            <div style={{textAlign:'center',marginBottom:28}}>
              <i className={`fa-solid ${board.icon}`} style={{fontSize:42,color:'var(--text-muted)',display:'block',marginBottom:14}}/>
              <h3 className="font-space" style={{fontSize:20,marginBottom:8}}>Data Belum Tersedia</h3>
              <p style={{color:'var(--text-muted)',fontSize:13}}>Menunggu data dari plugin Minecraft. Pastikan konfigurasi plugin sudah benar.</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:680,margin:'0 auto'}}>
              {[
                {
                  step:1, icon:'fa-plug', title:'Pastikan Plugin Sudah Aktif',
                  desc:'Plugin harus sudah diinstall dan berjalan di server Minecraft. Cek dengan command /shadowyn ping di dalam game.',
                },
                {
                  step:2, icon:'fa-gear', title:'Konfigurasi config.yml Plugin',
                  desc:'Pastikan bagian leaderboard di config.yml plugin sudah seperti ini:',
                  code:`leaderboards:\n  sync-enabled: true\n  endpoint: https://www.fancynet.my.id/api/leaderboard\n  sync-interval: 300\n  top-entries: 10\n  boards:\n    money: ...\n    auraskills: ...\n    votes: ...\n    playtime: ...\n    playerpoints: ...`,
                },
                {
                  step:3, icon:'fa-vial', title:'Test Push Manual (opsional)',
                  desc:'Kirim data test ke endpoint untuk verifikasi koneksi berhasil:',
                  code:`curl -X POST https://www.fancynet.my.id/api/leaderboard \\\n  -H "Content-Type: application/json" \\\n  -d '{"board":"money","entries":[{"rank":1,"player":"TestPlayer","value":99999}]}'`,
                },
                {
                  step:4, icon:'fa-rotate', title:'Tunggu Sync Otomatis',
                  desc:'Plugin akan sync otomatis sesuai sync-interval di config. Atau restart plugin untuk memaksa sync sekarang.',
                },
              ].map(item => (
                <div key={item.step} className="fn-card" style={{padding:'18px 22px'}} data-anim="fade-left">
                  <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                    <div style={{width:36,height:36,background:'rgba(255,107,0,0.1)',border:'1px solid rgba(255,107,0,0.25)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <i className={`fa-solid ${item.icon}`} style={{color:'var(--primary)',fontSize:14}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:10,background:'var(--primary)',color:'#fff',fontWeight:700,padding:'1px 7px',borderRadius:20,flexShrink:0}}>STEP {item.step}</span>
                        <p style={{fontWeight:700,fontSize:14,color:'#fff'}}>{item.title}</p>
                      </div>
                      <p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.5,marginBottom:item.code?10:0}}>{item.desc}</p>
                      {item.code && (
                        <pre style={{fontSize:11,color:'#aaa',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'10px 12px',lineHeight:1.7,fontFamily:'monospace',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{item.code}</pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:12,marginTop:20}}>
              <i className="fa-solid fa-circle-info" style={{marginRight:6,color:'var(--primary)'}}/>
              Setelah plugin push data, leaderboard akan muncul otomatis di sini.
            </p>
          </div>

        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {/* ── Top 3 Podium ──
                - minWidth:0 pada grid agar cells tidak overflow
                - overflow:hidden + text-overflow di semua teks
                - padding dikurangi supaya tidak sesak
            ── */}
            {entries.length >= 3 && (() => {
              const podOrder = [entries[1], entries[0], entries[2]]; // 2nd, 1st, 3rd
              const podRanks  = [2, 1, 3];
              const podH      = ['155px', '195px', '135px'];
              return (
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'1fr 1fr 1fr',
                  gap:10,
                  marginBottom:12,
                  alignItems:'flex-end',
                  width:'100%',
                }}>
                  {podOrder.map((e, i) => {
                    const podRank = podRanks[i];
                    const col     = RANK_COLORS[podRank];
                    return (
                      <div key={e.rank} className="fn-card" style={{
                        height: podH[i],
                        background:'rgba(0,0,0,0.3)',
                        border:`1px solid ${col}44`,
                        borderRadius:14,
                        display:'flex',
                        flexDirection:'column',
                        alignItems:'center',
                        justifyContent:'center',
                        gap:6,
                        padding:'12px 8px',  /* reduced padding */
                        overflow:'hidden',   /* clip anything that tries to escape */
                        minWidth:0,          /* allow grid cell to shrink */
                        boxSizing:'border-box',
                      }}>
                        <i className={`fa-solid ${RANK_ICONS[podRank]}`} style={{fontSize:18,color:col,flexShrink:0}}/>
                        <PlayerAvatar uuid={e.player} username={e.player} size={podRank===1?40:32}/>
                        {/* Player name — hard-truncate with ellipsis */}
                        <span style={{
                          fontWeight:700,
                          fontSize: podRank===1 ? 12 : 11,
                          color:'#fff',
                          width:'100%',
                          textAlign:'center',
                          overflow:'hidden',
                          textOverflow:'ellipsis',
                          whiteSpace:'nowrap',
                          lineHeight:1.3,
                        }}>{e.player}</span>
                        {/* Score */}
                        <span className="font-space" style={{
                          fontWeight:700,
                          color:col,
                          fontSize: podRank===1 ? 14 : 12,
                          overflow:'hidden',
                          textOverflow:'ellipsis',
                          whiteSpace:'nowrap',
                          maxWidth:'100%',
                        }}>
                          {fmtScore(e.score, board.unit)}
                        </span>
                        <span style={{fontSize:9,color:col,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,flexShrink:0}}>#{podRank}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Full ranked list ── */}
            {entries.map((e, rowIdx) => {
              const isTop3  = e.rank <= 3;
              const rankCol = RANK_COLORS[e.rank];
              return (
                <div key={e.rank}
                  className={`lb-row${e.rank===1?' rank-1':e.rank===2?' rank-2':e.rank===3?' rank-3':''}  leaderboard-row`}
                  style={{animationDelay: `${rowIdx * 0.04}s`}}>
                  {/* Rank */}
                  <div style={{width:36,flexShrink:0,textAlign:'center'}}>
                    {isTop3
                      ? <i className={`fa-solid ${RANK_ICONS[e.rank]}`} style={{fontSize:18,color:rankCol}}/>
                      : <span style={{fontWeight:700,color:'var(--text-muted)',fontSize:14}}>#{e.rank}</span>
                    }
                  </div>
                  {/* Avatar */}
                  <PlayerAvatar uuid={e.player} username={e.player} size={34}/>
                  {/* Name */}
                  <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                    <p style={{fontWeight:700,fontSize:14,color:isTop3?rankCol:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.player}</p>
                  </div>
                  {/* Score */}
                  <div style={{textAlign:'right',flexShrink:0,paddingLeft:8}}>
                    <p className="font-space" style={{fontWeight:700,fontSize:14,color:isTop3?rankCol:board.color}}>{fmtScore(e.score,board.unit)}</p>
                    <p style={{fontSize:10,color:'var(--text-muted)',fontWeight:600}}>{board.unit}</p>
                  </div>
                </div>
              );
            })}

            {/* Last sync note */}
            <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:11,marginTop:12}}>
              <i className="fa-solid fa-rotate" style={{marginRight:4,color:connMeta[active]?.source==='plugin-endpoint'?'#2ecc71':'var(--text-muted)'}}/>
              {connMeta[active]?.source==='plugin-endpoint'
                ? <><span>Pull dari plugin endpoint</span> • <span style={{color:'#2ecc71'}}>Auto-refresh 60 detik</span></>
                : 'Data dikirim oleh plugin • Diperbarui sesuai interval konfigurasi'
              }
            </p>
          </div>
        )}
      </div>

      <footer className="fn-footer" data-anim="fade-up">
        <p style={{fontSize:11,color:'#44444a'}}>© 2026 {serverName}. Leaderboard</p>
      </footer>

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={p=>{setPlayer(p);localStorage.setItem('mc_player',JSON.stringify(p));setShowLogin(false);}}/>}
    </>
  );
}
