import { useTransparentLogo } from '../../components/LogoImage';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Settings } from '../../lib/storage.js';
import FancyNav from '../../components/FancyNav';
import LoginModal from '../../components/LoginModal';
import toast from 'react-hot-toast';

export function getServerSideProps() {
  try { return { props:{ settings: Settings.get() } }; }
  catch { return { props:{ settings:{} } }; }
}

const TYPES = [
  { id:'banding',       icon:'fa-gavel',        label:'Aju Banding',   desc:'Ajukan banding untuk keputusan admin / akun banned',     color:'#e67e22' },
  { id:'bug',           icon:'fa-bug',          label:'Report Bug',    desc:'Temukan bug atau masalah teknis? Laporkan di sini',       color:'#3498db' },
  { id:'report_player', icon:'fa-user-xmark',   label:'Report Pemain', desc:'Laporkan pemain yang melanggar aturan server',            color:'#e74c3c' },
  { id:'lainnya',       icon:'fa-comment-dots', label:'Lainnya',       desc:'Pertanyaan umum, saran, atau feedback lainnya',          color:'#9b59b6' },
];

const STATUS = {
  open:      { label:'Menunggu',  color:'#f1c40f' },
  in_review: { label:'Direview', color:'#3498db' },
  resolved:  { label:'Selesai',  color:'#2ecc71' },
  rejected:  { label:'Ditolak',  color:'#e74c3c' },
};

export default function SupportPage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [view,      setView]      = useState('home');  // home | form | tickets
  const [selType,   setSelType]   = useState(null);
  const [tickets,   setTickets]   = useState([]);
  const [sending,   setSending]   = useState(false);
  const [form,      setForm]      = useState({ subject:'', description:'', target_player:'', evidence_url:'' });

  useEffect(() => {
    let p = null;
    try { const r = localStorage.getItem('mc_player'); if (r) { p = JSON.parse(r); setPlayer(p); } } catch{}
    // Muat tiket jika sudah ada sesi
    if (p) {
      let token = null;
      try { const d = localStorage.getItem('mc_token'); if(d) token = d; } catch{}
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/support', {credentials:'include', headers})
        .then(r=>r.json())
        .then(d=>{ if(d.success && d.tickets) setTickets(d.tickets||[]); })
        .catch(()=>{});
    }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player'); toast.success('Berhasil keluar');
  };

  const loadTickets = async () => {
    try {
      let token = null;
      try { const d = localStorage.getItem('mc_token'); if(d) token = d; } catch{}
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch('/api/support',{credentials:'include', headers});
      const d = await r.json();
      if (d.success) setTickets(d.tickets||[]);
    } catch {}
  };

  const handleSelectType = (id) => {
    if (!player) { setShowLogin(true); return; }
    setSelType(id); setView('form');
    setForm({ subject:'', description:'', target_player:'', evidence_url:'' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!player) { setShowLogin(true); return; }
    setSending(true);
    try {
      // Ambil token dari localStorage sebagai fallback jika cookie tidak terkirim
      let token = null;
      try { const d = localStorage.getItem('mc_token'); if(d) token = d; } catch{}
      const headers = {'Content-Type':'application/json'};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/support',{method:'POST', headers, credentials:'include',
        body:JSON.stringify({type:selType,...form})});
      const d = await res.json();
      if (d.success) {
        toast.success(`Tiket ${d.ticketId} berhasil dibuat!`);
        setView('tickets'); loadTickets();
      } else {
        if (res.status === 401) {
          toast.error('Sesi habis, silakan login ulang');
          setShowLogin(true);
        } else {
          toast.error(d.message||'Gagal membuat tiket');
        }
      }
    } catch { toast.error('Server error'); }
    setSending(false);
  };

  const typeInfo = TYPES.find(t=>t.id===selType);

  return (
    <>
      <Head>
        <title>Support — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Support Center ${serverName}`}/>
        {s.logo_url
          ? <link rel="icon" type="image/png" href={s.logo_url}/>
          : <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>"/>
        }
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <div style={{padding:'130px 6% 80px',maxWidth:800,margin:'0 auto'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>PUSAT BANTUAN</span>
          <h1 className="font-space" style={{fontSize:'clamp(24px,5vw,34px)',fontWeight:700,marginBottom:10}}>
            Support <span style={{color:'var(--primary)'}}>Center</span>
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:14}}>{serverName} — Tim kami siap membantu kamu</p>
        </div>

        {/* Nav tabs */}
        <div className="tabs-container" style={{marginBottom:32,maxWidth:360,margin:'0 auto 32px'}}>
          <button className={`tab-btn${view==='home'||view==='form'?' active':''}`}
            onClick={()=>setView('home')}>
            <i className="fa-solid fa-plus-circle"/> Buat Tiket
          </button>
          <button className={`tab-btn${view==='tickets'?' active':''}`}
            onClick={()=>{ setView('tickets'); loadTickets(); }}>
            <i className="fa-solid fa-list-check"/> Tiket Saya
          </button>
        </div>

        {/* ── HOME: pilih tipe ── */}
        {view === 'home' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
            {!player && (
              <div style={{gridColumn:'1/-1',background:'rgba(255,107,0,0.06)',border:'1px solid rgba(255,107,0,0.2)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                <i className="fa-solid fa-circle-exclamation" style={{color:'var(--primary)',fontSize:18}}/>
                <p style={{fontSize:13,color:'var(--text-muted)'}}>
                  Kamu perlu <strong style={{color:'#fff',cursor:'pointer'}} onClick={()=>setShowLogin(true)}>login</strong> untuk membuat tiket.
                </p>
              </div>
            )}
            {TYPES.map(t=>(
              <button key={t.id} onClick={()=>handleSelectType(t.id)} className="support-cat-card" style={{width:'100%',textAlign:'left',background:'transparent',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
                <div className="cat-icon" style={{background:`${t.color}18`,color:t.color}}>
                  <i className={`fa-solid ${t.icon}`}/>
                </div>
                <div>
                  <p style={{fontWeight:700,fontSize:14,color:'#fff',marginBottom:4}}>{t.label}</p>
                  <p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.4}}>{t.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right" style={{color:'var(--text-muted)',fontSize:12,marginLeft:'auto',flexShrink:0}}/>
              </button>
            ))}
          </div>
        )}

        {/* ── FORM ── */}
        {view === 'form' && typeInfo && (
          <div className="fn-card animate-in" style={{padding:'28px 28px 32px'}}>
            <button onClick={()=>setView('home')} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,marginBottom:20}}>
              <i className="fa-solid fa-arrow-left"/> Kembali
            </button>

            {/* Type badge */}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:'14px 18px'}}>
              <div className="cat-icon" style={{background:`${typeInfo.color}18`,color:typeInfo.color,width:44,height:44,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                <i className={`fa-solid ${typeInfo.icon}`}/>
              </div>
              <div>
                <p className="font-space" style={{fontWeight:700,fontSize:16}}>{typeInfo.label}</p>
                <p style={{fontSize:12,color:'var(--text-muted)'}}>
                  Login sebagai <strong style={{color:'var(--primary-light)'}}>{player?.displayName||player?.username}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
              {selType==='report_player' && (
                <div>
                  <label className="section-label">Username Pemain yang Dilaporkan *</label>
                  <input value={form.target_player} onChange={e=>setForm(p=>({...p,target_player:e.target.value}))}
                    className="fn-input" placeholder="Nama player" required/>
                </div>
              )}
              <div>
                <label className="section-label">Subjek *</label>
                <input value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}
                  className="fn-input" placeholder="Ringkasan masalahmu..." required maxLength={200}/>
              </div>
              <div>
                <label className="section-label">Deskripsi Lengkap *</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  className="fn-input" rows={5} placeholder="Jelaskan masalahmu secara detail..." required
                  style={{resize:'vertical',minHeight:120}}/>
              </div>
              <div>
                <label className="section-label">Link Bukti / Screenshot <span style={{fontWeight:400,textTransform:'none',color:'var(--text-muted)'}}>(opsional)</span></label>
                <input value={form.evidence_url} onChange={e=>setForm(p=>({...p,evidence_url:e.target.value}))}
                  className="fn-input" placeholder="https://imgur.com/..."/>
              </div>
              <button type="submit" className="btn-primary-fn" disabled={sending}
                style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:14,borderRadius:10,marginTop:4}}>
                {sending
                  ? <><span className="fn-spinner" style={{width:16,height:16,borderWidth:2}}/> Mengirim...</>
                  : <><i className={`fa-solid ${typeInfo.icon}`}/> Kirim Tiket</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ── TIKET SAYA ── */}
        {view === 'tickets' && (
          <div>
            {!player ? (
              <div style={{textAlign:'center',padding:'60px 0'}}>
                <i className="fa-solid fa-lock" style={{fontSize:40,color:'var(--text-muted)',display:'block',marginBottom:16}}/>
                <p style={{color:'var(--text-muted)',marginBottom:16}}>Login untuk melihat tiketmu</p>
                <button className="btn-primary-fn" onClick={()=>setShowLogin(true)}>
                  <i className="fa-solid fa-right-to-bracket"/> Login
                </button>
              </div>
            ) : tickets.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 0'}}>
                <i className="fa-solid fa-inbox" style={{fontSize:40,color:'var(--text-muted)',display:'block',marginBottom:16}}/>
                <p style={{color:'var(--text-muted)',marginBottom:12}}>Belum ada tiket</p>
                <button className="btn-ghost-fn" onClick={()=>setView('home')}>
                  <i className="fa-solid fa-plus"/> Buat Tiket Baru
                </button>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {tickets.map(tk => {
                  const t   = TYPES.find(x=>x.id===tk.type);
                  const st  = STATUS[tk.status] || STATUS.open;
                  return (
                    <div key={tk.ticket_id} className="fn-card animate-in" style={{padding:'20px 22px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:36,height:36,borderRadius:8,background:`${t?.color||'var(--primary)'}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <i className={`fa-solid ${t?.icon||'fa-ticket'}`} style={{color:t?.color||'var(--primary)',fontSize:15}}/>
                          </div>
                          <div>
                            <p style={{fontWeight:700,fontSize:14,color:'#fff',marginBottom:2}}>{tk.subject}</p>
                            <code style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{tk.ticket_id}</code>
                          </div>
                        </div>
                        <span style={{background:`${st.color}18`,color:st.color,border:`1px solid ${st.color}44`,padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700,flexShrink:0}}>
                          {st.label}
                        </span>
                      </div>

                      {/* Admin reply */}
                      {tk.admin_reply && (
                        <div style={{background:'rgba(52,152,219,0.06)',border:'1px solid rgba(52,152,219,0.2)',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
                          <p style={{fontSize:11,color:'#3498db',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>
                            <i className="fa-solid fa-comment-dots" style={{marginRight:6}}/>Balasan Admin
                          </p>
                          <p style={{fontSize:13,color:'#e0e0e6',lineHeight:1.6}}>{tk.admin_reply}</p>
                        </div>
                      )}

                      <p style={{fontSize:11,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6}}>
                        <i className="fa-solid fa-clock"/>
                        {new Date(tk.created_at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}
                        {tk.evidence_url && (
                          <a href={tk.evidence_url} target="_blank" rel="noopener noreferrer"
                            style={{color:'var(--primary)',textDecoration:'none',marginLeft:8,display:'inline-flex',alignItems:'center',gap:4}}>
                            <i className="fa-solid fa-link" style={{fontSize:10}}/> Bukti
                          </a>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="fn-footer">
        <p style={{fontSize:11,color:'#44444a'}}>© 2026 {serverName}. Support Center</p>
      </footer>

      {showLogin && (
        <LoginModal onClose={()=>setShowLogin(false)} onSuccess={p=>{
          setPlayer(p);
          localStorage.setItem('mc_player',JSON.stringify(p));
          setShowLogin(false);
          loadTickets();
        }}/>
      )}
    </>
  );
}
