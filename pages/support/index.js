import { useTransparentLogo, updateFavicon } from '../../components/LogoImage';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
// SettingsAsync loaded server-side via dynamic import in getServerSideProps
import FancyNav from '../../components/FancyNav';
import LoginModal from '../../components/LoginModal';
import FancyFooter from '../../components/FancyFooter';
import toast from 'react-hot-toast';
import Icon from '../../components/Icon';

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../../lib/redis.js');
    return { props:{ settings: await SettingsAsync.get() } };
  } catch { return { props:{ settings:{} } }; }
}

const TYPES = [
  { id:'banding',       icon:'gavel',        label:'Aju Banding',   desc:'Ajukan banding untuk keputusan admin / akun banned',     color:'#e67e22' },
  { id:'bug',           icon:'bug',          label:'Report Bug',    desc:'Temukan bug atau masalah teknis? Laporkan di sini',       color:'#3498db' },
  { id:'report_player', icon:'user-xmark',   label:'Report Pemain', desc:'Laporkan pemain yang melanggar aturan server',            color:'#e74c3c' },
  { id:'lainnya',       icon:'comment-dots', label:'Lainnya',       desc:'Pertanyaan umum, saran, atau feedback lainnya',          color:'#9b59b6' },
];

const STATUS = {
  open:      { label:'Menunggu',  color:'#f1c40f' },
  in_review: { label:'Direview', color:'#3498db' },
  resolved:  { label:'Selesai',  color:'#2ecc71' },
  rejected:  { label:'Ditolak',  color:'#e74c3c' },
};

const fmt = d => d ? new Date(d).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}) : '-';

export default function SupportPage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,      setPlayer]      = useState(null);
  const [showLogin,   setShowLogin]   = useState(false);
  const [view,        setView]        = useState('home');  // home | form | tickets | chat
  const [selType,     setSelType]     = useState(null);
  const [tickets,     setTickets]     = useState([]);
  const [sending,     setSending]     = useState(false);
  const [form,        setForm]        = useState({ subject:'', description:'', target_player:'', evidence_url:'' });
  const [activeTicket,setActiveTicket]= useState(null);  // full ticket detail with messages
  const [newMsg,      setNewMsg]      = useState('');
  const [sendingMsg,  setSendingMsg]  = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sseStatus,   setSseStatus]   = useState('connecting'); // connecting | live | polling
  const chatEndRef = useRef(null);
  const pollingRef = useRef(null);
  const activeTicketRef = useRef(null);

  // Favicon
  useEffect(() => {
    if (logoSrc) updateFavicon(logoSrc);
  }, [logoSrc]);

  useEffect(() => {
    let p = null;
    try { const r = localStorage.getItem('mc_player'); if (r) { p = JSON.parse(r); setPlayer(p); } } catch{}
    if (p) loadTickets(p);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:'smooth' });
  }, [activeTicket?.messages]);

  // Sync activeTicket ke ref (untuk SSE closure)
  useEffect(() => { activeTicketRef.current = activeTicket; }, [activeTicket]);

  // ── SSE realtime saat view=chat, fallback polling 3 detik jika SSE gagal ──
  useEffect(() => {
    if (view !== 'chat' || !activeTicket?.ticket_id) return;
    let es = null;
    let reconnectTimer = null;

    const connect = () => {
      const tk = activeTicketRef.current;
      if (!tk) return;
      let token = '';
      try { token = localStorage.getItem('mc_token') || ''; } catch{}
      const url = `/api/support/events?ticket_id=${tk.ticket_id}${token?`&token=${encodeURIComponent(token)}`:''}`;
      es = new EventSource(url);
      setSseStatus('connecting');
      es.onopen    = () => setSseStatus('live');
      es.onmessage = (e) => { try { const { ticket } = JSON.parse(e.data); if (ticket) setActiveTicket(ticket); } catch {} };
      es.addEventListener('reconnect', () => { es.close(); reconnectTimer = setTimeout(connect, 600); });
      es.onerror   = () => {
        setSseStatus('polling');
        es.close();
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          const cur = activeTicketRef.current;
          if (!cur) return;
          try {
            const headers = {'Content-Type':'application/json'};
            try { const t = localStorage.getItem('mc_token'); if(t) headers['Authorization'] = `Bearer ${t}`; } catch{}
            const r = await fetch(`/api/support?id=${cur.ticket_id}`, { credentials:'include', headers });
            const d = await r.json();
            if (d.success && d.ticket) {
              if ((d.ticket.messages||[]).length !== (activeTicketRef.current?.messages||[]).length
                || d.ticket.status !== activeTicketRef.current?.status) {
                setActiveTicket(d.ticket);
              }
            }
          } catch {}
        }, 3000);
      };
    };
    connect();
    return () => {
      if (es) { es.close(); }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [view, activeTicket?.ticket_id]);

  const authHeaders = () => {
    const headers = {'Content-Type':'application/json'};
    try { const t = localStorage.getItem('mc_token'); if(t) headers['Authorization'] = `Bearer ${t}`; } catch{}
    return headers;
  };

  const loadTickets = async (p) => {
    try {
      const r = await fetch('/api/support',{credentials:'include', headers: authHeaders()});
      const d = await r.json();
      if(d.success && d.tickets) setTickets(d.tickets||[]);
    } catch {}
  };

  const loadTicketDetail = async (ticketId) => {
    setLoadingChat(true);
    try {
      const r = await fetch(`/api/support?id=${ticketId}`,{credentials:'include', headers: authHeaders()});
      const d = await r.json();
      if(d.success) setActiveTicket(d.ticket);
    } catch {}
    setLoadingChat(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player'); toast.success('Berhasil keluar');
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
      const res = await fetch('/api/support',{method:'POST', headers: authHeaders(), credentials:'include',
        body:JSON.stringify({type:selType,...form})});
      const d = await res.json();
      if (d.success) {
        toast.success(`Tiket ${d.ticketId} berhasil dibuat!`);
        setView('tickets'); loadTickets();
      } else {
        if (res.status === 401) { toast.error('Sesi habis, silakan login ulang'); setShowLogin(true); }
        else toast.error(d.message||'Gagal membuat tiket');
      }
    } catch { toast.error('Server error'); }
    setSending(false);
  };

  const handleOpenChat = async (tk) => {
    setActiveTicket(null);
    setView('chat');
    await loadTicketDetail(tk.ticket_id);
  };

  const handleSendMessage = async () => {
    if (!newMsg.trim() || sendingMsg) return;
    const text = newMsg.trim();
    const tempMsg = {
      id:'temp-'+Date.now(), sender:player.username, sender_type:'player',
      text, created_at:new Date().toISOString(), _pending:true,
    };
    setActiveTicket(prev => prev ? { ...prev, messages:[...(prev.messages||[]),tempMsg] } : prev);
    setNewMsg('');
    setSendingMsg(true);
    try {
      const res = await fetch('/api/support',{method:'PATCH', headers:authHeaders(), credentials:'include',
        body:JSON.stringify({ ticket_id:activeTicket.ticket_id, text })});
      const d = await res.json();
      if (!d.success) {
        setActiveTicket(prev => prev ? { ...prev, messages:(prev.messages||[]).filter(m=>m.id!==tempMsg.id) } : prev);
        toast.error(d.message || 'Gagal mengirim pesan');
      } else {
        loadTickets();
      }
    } catch {
      setActiveTicket(prev => prev ? { ...prev, messages:(prev.messages||[]).filter(m=>m.id!==tempMsg.id) } : prev);
      toast.error('Server error');
    }
    setSendingMsg(false);
  };

  const typeInfo = TYPES.find(t=>t.id===selType);
  const chatType = activeTicket ? TYPES.find(t=>t.id===activeTicket.type) : null;
  const chatStatus = activeTicket ? STATUS[activeTicket.status] || STATUS.open : null;
  const isClosed = activeTicket?.status === 'resolved' || activeTicket?.status === 'rejected';

  return (
    <>
      <Head>
        <title>Support — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Support Center ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      {/* Pembungkus Utama Menggunakan Flexbox untuk Menata Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        {/* Konten Utama: Menggunakan flex: 1 untuk mendorong footer ke bawah & max-width yang proporsional */}
        <main style={{ flex: '1 0 auto', padding: '130px 6% 80px', maxWidth: '720px', width: '100%', margin: '0 auto' }}>

          {/* Header */}
          <div style={{textAlign:'center',marginBottom:40}} data-anim="fade-up">
            <span style={{color:'var(--primary)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:8}}>PUSAT BANTUAN</span>
            {/* Responsif Menggunakan clamp: Min 24px di HP, Ideal 4.5vw, Max 30px di Desktop agar tidak kebesaran */}
            <h1 className="font-space" style={{fontSize:'clamp(24px, 4.5vw, 30px)',fontWeight:700,marginBottom:10}}>
              Support <span style={{color:'var(--primary)'}}>Center</span>
            </h1>
            <p style={{color:'var(--text-muted)',fontSize:14}}>{serverName} — Tim kami siap membantu kamu</p>
          </div>

          {/* Nav tabs */}
          <div className="tabs-container" style={{marginBottom:32,maxWidth:360,margin:'0 auto 32px'}}>
            <button className={`tab-btn${view==='home'||view==='form'?' active':''}`}
              onClick={()=>setView('home')}>
              <Icon name="plus-circle" size={14} style={{marginRight:6}}/> Buat Tiket
            </button>
            <button className={`tab-btn${view==='tickets'||view==='chat'?' active':''}`}
              onClick={()=>{ setView('tickets'); loadTickets(); }}>
              <Icon name="list-check" size={14} style={{marginRight:6}}/> Tiket Saya
            </button>
          </div>

          {/* ── HOME: pilih tipe ── */}
          {view === 'home' && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
              {!player && (
                <div style={{gridColumn:'1/-1',background:'rgba(255,107,0,0.06)',border:'1px solid rgba(255,107,0,0.2)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                  <Icon name="circle-exclamation" size={18} color="var(--primary)"/>
                  <p style={{fontSize:13,color:'var(--text-muted)'}}>
                    Kamu perlu <strong style={{color:'#fff',cursor:'pointer'}} onClick={()=>setShowLogin(true)}>login</strong> untuk membuat tiket.
                  </p>
                </div>
              )}
              {TYPES.map(t=>(
                <button key={t.id} onClick={()=>handleSelectType(t.id)} className="support-cat-card" style={{width:'100%',textAlign:'left',background:'transparent',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
                  <div className="cat-icon" style={{background:`${t.color}18`,color:t.color}}>
                    <Icon name={t.icon} size={16}/>
                  </div>
                  <div>
                    <p style={{fontWeight:700,fontSize:14,color:'#fff',marginBottom:4}}>{t.label}</p>
                    <p style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.4}}>{t.desc}</p>
                  </div>
                  <Icon name="chevron-right" size={12} color="var(--text-muted)" style={{marginLeft:'auto',flexShrink:0}}/>
                </button>
              ))}
            </div>
          )}

          {/* ── FORM ── */}
          {view === 'form' && typeInfo && (
            <div className="fn-card" style={{padding:'28px 28px 32px'}} data-anim="fade-up">
              <button onClick={()=>setView('home')} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,marginBottom:20}}>
                <Icon name="arrow-left" size={14} style={{marginRight:6}}/> Kembali
              </button>

              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:'14px 18px'}}>
                <div className="cat-icon" style={{background:`${typeInfo.color}18`,color:typeInfo.color,width:44,height:44,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                  <Icon name={typeInfo.icon} size={16}/>
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
                    : <><Icon name={typeInfo.icon} size={16}/> Kirim Tiket</>
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
                  <Icon name="lock" size={40} color="var(--text-muted)" style={{display:'block',marginBottom:16}}/>
                  <p style={{color:'var(--text-muted)',marginBottom:16}}>Login untuk melihat tiketmu</p>
                  <button className="btn-primary-fn" onClick={()=>setShowLogin(true)}>
                    <Icon name="right-to-bracket" size={14} style={{marginRight:6}}/> Login
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div style={{textAlign:'center',padding:'60px 0'}}>
                  <Icon name="inbox" size={40} color="var(--text-muted)" style={{display:'block',marginBottom:16}}/>
                  <p style={{color:'var(--text-muted)',marginBottom:12}}>Belum ada tiket</p>
                  <button className="btn-ghost-fn" onClick={()=>setView('home')}>
                    <Icon name="plus" size={14} style={{marginRight:6}}/> Buat Tiket Baru
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {tickets.map(tk => {
                    const t  = TYPES.find(x=>x.id===tk.type);
                    const st = STATUS[tk.status] || STATUS.open;
                    return (
                      <div key={tk.ticket_id} className="fn-card animate-in"
                        style={{padding:'18px 22px',cursor:'pointer',transition:'border-color 0.2s'}}
                        onClick={()=>handleOpenChat(tk)}>
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                            <div style={{width:36,height:36,borderRadius:8,background:`${t?.color||'var(--primary)'}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <Icon name={t?.icon||'ticket'} size={15} color={t?.color||'var(--primary)'}/>
                            </div>
                            <div style={{minWidth:0}}>
                              <p style={{fontWeight:700,fontSize:14,color:'#fff',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tk.subject}</p>
                              <code style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace'}}>{tk.ticket_id}</code>
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                            <span style={{background:`${st.color}18`,color:st.color,border:`1px solid ${st.color}44`,padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700}}>
                              {st.label}
                            </span>
                            <span style={{fontSize:10,color:'var(--text-muted)'}}>{fmt(tk.updated_at||tk.created_at)}</span>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <p style={{fontSize:12,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6}}>
                            <Icon name="comment-dots" size={13}/>
                            {tk.messages?.length || 0} pesan
                          </p>
                          <span style={{fontSize:12,color:'var(--primary)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                            <Icon name="arrow-right" size={10} style={{marginLeft:2}}/> Buka Chat
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CHAT ── */}
          {view === 'chat' && (
            <div className="fn-card" style={{padding:0,overflow:'hidden'}} data-anim="scale-pop">
              {/* Chat header */}
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>{ setView('tickets'); loadTickets(); }}
                  style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',padding:'4px 8px',borderRadius:6,display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600}}>
                  <Icon name="arrow-left" size={14} style={{marginRight:6}}/> Kembali
                </button>
                {activeTicket && (
                  <>
                    <div style={{width:1,height:20,background:'rgba(255,255,255,0.1)'}}/>
                    <div style={{width:30,height:30,borderRadius:7,background:`${chatType?.color||'var(--primary)'}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon name={chatType?.icon||'ticket'} size={13} color={chatType?.color||'var(--primary)'}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:13,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeTicket.subject}</p>
                      <code style={{fontSize:10,color:'var(--text-muted)'}}>{activeTicket.ticket_id}</code>
                    </div>
                    <span style={{background:`${chatStatus?.color}18`,color:chatStatus?.color,border:`1px solid ${chatStatus?.color}44`,padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700,flexShrink:0}}>
                      {chatStatus?.label}
                    </span>
                    {/* SSE status indicator */}
                    <div title={sseStatus==='live'?'Realtime aktif':sseStatus==='polling'?'Mode polling':'Menghubungkan...'} style={{flexShrink:0}}>
                      <span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:sseStatus==='live'?'#2ecc71':sseStatus==='polling'?'#f1c40f':'var(--text-muted)'}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:sseStatus==='live'?'#2ecc71':sseStatus==='polling'?'#f1c40f':'#8e8e9a',display:'inline-block',animation:sseStatus==='live'?'pulse-dot 2s infinite':undefined}}/>
                        {sseStatus==='live'?'Live':sseStatus==='polling'?'Polling':'...'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Messages area */}
              <div style={{minHeight:320,maxHeight:'55vh',overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
                {loadingChat ? (
                  <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)'}}>
                    <Icon name="spinner" size={28} spin/>
                  </div>
                ) : activeTicket && (
                  <>
                    {/* Ticket info box */}
                    {activeTicket.evidence_url && (
                      <div style={{background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--text-muted)'}}>
                        <Icon name="link" size={12} style={{marginRight:6}}/>
                        Bukti: <a href={activeTicket.evidence_url} target="_blank" rel="noopener noreferrer" style={{color:'#3498db',textDecoration:'none'}}>{activeTicket.evidence_url}</a>
                      </div>
                    )}
                    {(activeTicket.messages||[]).map((msg,i) => {
                      const isAdmin  = msg.sender_type === 'admin';
                      const isPending = !!msg._pending;
                      return (
                        <div key={msg.id||i} style={{display:'flex',flexDirection:'column',alignItems: isAdmin ? 'flex-end' : 'flex-start'}}>
                          <div style={{
                            maxWidth:'80%',
                            background: isAdmin ? 'rgba(52,152,219,0.1)' : isPending ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.04)',
                            border: isAdmin ? '1px solid rgba(52,152,219,0.25)' : isPending ? '1px dashed rgba(255,107,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
                            borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding:'10px 14px',
                            opacity: isPending ? 0.75 : 1,
                          }}>
                            <p style={{fontSize:11,fontWeight:700,color: isAdmin ? '#3498db' : 'var(--primary-light)',marginBottom:5}}>
                              {isAdmin ? '🛡️ Admin' : `👤 ${msg.sender}`}
                            </p>
                            <p style={{fontSize:13,color:'#e0e0e6',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{msg.text}</p>
                          </div>
                          <p style={{fontSize:10,color:'var(--text-muted)',marginTop:4,padding:'0 4px'}}>
                            {isPending ? '⏳ Mengirim...' : fmt(msg.created_at)}
                          </p>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef}/>
                  </>
                )}
              </div>

              {/* Input area */}
              <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                {isClosed ? (
                  <div style={{textAlign:'center',padding:'10px',color:'var(--text-muted)',fontSize:13}}>
                    <Icon name="lock" size={12} style={{marginRight:6}}/>
                    Tiket ini sudah ditutup — tidak bisa mengirim pesan baru
                  </div>
                ) : (
                  <div style={{display:'flex',gap:8}}>
                    <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} rows={2}
                      placeholder="Tulis pesanmu di sini..."
                      onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) handleSendMessage(); }}
                      className="fn-input" style={{flex:1,resize:'none',fontSize:13,padding:'10px 14px'}}/>
                    <button onClick={handleSendMessage} disabled={sendingMsg||!newMsg.trim()}
                      className="btn-primary-fn" style={{flexShrink:0,alignSelf:'flex-end',padding:'10px 16px'}}>
                      {sendingMsg?<Icon name="spinner" size={14} spin/>:<><Icon name="paper-plane" size={14} style={{marginRight:6}}/> Kirim</>}
                    </button>
                  </div>
                )}
                {!isClosed && <p style={{fontSize:10,color:'var(--text-muted)',marginTop:5}}>Ctrl+Enter untuk kirim cepat</p>}
              </div>
            </div>
          )}

        </main>

        {/* Footer Berada di Luar <main> namun di Dalam Pembungkus Flexbox, Menjamin Posisinya Selalu di Bawah */}
        <FancyFooter serverName={serverName} style={{ flexShrink: 0 }} />

      </div>

      {showLogin && (
        <LoginModal onClose={()=>setShowLogin(false)} onSuccess={p=>{
          setPlayer(p);
          localStorage.setItem('mc_player',JSON.stringify(p));
          setShowLogin(false);
          loadTickets(p);
        }}/>
      )}
    </>
  );
}
