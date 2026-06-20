import { useTransparentLogo, updateFavicon } from '../../components/LogoImage';
import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
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
  { id:'banding',       icon:'gavel',        label:'Aju Banding',   desc:'Ajukan banding untuk keputusan admin atau akun terblokir.', color:'#F97316' },
  { id:'bug',           icon:'bug',          label:'Report Bug',    desc:'Temukan celah atau masalah teknis? Laporkan di sini.',     color:'#F97316' },
  { id:'report_player', icon:'user-xmark',   label:'Report Pemain', desc:'Laporkan pemain yang melanggar aturan komunitas.',          color:'#F97316' },
  { id:'lainnya',       icon:'comment-dots', label:'Lainnya',       desc:'Pertanyaan umum, saran, atau feedback operasional.',      color:'#F97316' },
];

const STATUS = {
  open:      { label:'Menunggu',  color:'#EA580C', bg: 'rgba(234,88,12,0.08)' },
  in_review: { label:'Direview', color:'#F97316', bg: 'rgba(249,115,22,0.08)' },
  resolved:  { label:'Selasai',  color:'#16A34A', bg: 'rgba(22,163,74,0.08)' },
  rejected:  { label:'Ditolak',  color:'#DC2626', bg: 'rgba(220,38,38,0.08)' },
};

const fmt = d => d ? new Date(d).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}) : '-';

export default function SupportPage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,      setPlayer]      = useState(null);
  const [showLogin,   setShowLogin]   = useState(false);
  const [view,        setView]        = useState('home');  
  const [selType,     setSelType]     = useState(null);
  const [tickets,     setTickets]     = useState([]);
  const [sending,     setSending]     = useState(false);
  const [form,        setForm]        = useState({ subject:'', description:'', target_player:'', evidence_url:'' });
  const [activeTicket,setActiveTicket]= useState(null);  
  const [newMsg,      setNewMsg]      = useState('');
  const [sendingMsg,  setSendingMsg]  = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sseStatus,   setSseStatus]   = useState('connecting'); 
  const [isLoaded,    setIsLoaded]    = useState(false);
  const chatEndRef = useRef(null);
  const pollingRef = useRef(null);
  const activeTicketRef = useRef(null);

  useEffect(() => {
    if (logoSrc) updateFavicon(logoSrc);
  }, [logoSrc]);

  useEffect(() => {
    // Staggered page load animation trigger
    const t = setTimeout(() => setIsLoaded(true), 50);
    
    let p = null;
    try { const r = localStorage.getItem('mc_player'); if (r) { p = JSON.parse(r); setPlayer(p); } } catch{}
    if (p) loadTickets(p);

    return () => clearTimeout(t);
  }, []);

  // Intersection observer untuk card list tiket / menu categories support
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' });

    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [view, tickets]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior:'smooth' });
  }, [activeTicket?.messages]);

  useEffect(() => { activeTicketRef.current = activeTicket; }, [activeTicket]);

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

      <div className="orange-theme-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#FFFFFF', color: '#1A0D05', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Soft Ambient Background Glow */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} className="gpu-glow-layer">
          <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '450px', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        <main style={{ flex: '1 0 auto', padding: '140px 16px 80px', maxWidth: '760px', width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* HEADER SECTION (STAGGERED LOAD) */}
          <div style={{textAlign:'center', marginBottom:40}} className={isLoaded ? 'load-animate loaded' : 'load-animate'}>
            <span style={{display:'inline-flex', padding:'4px 12px', borderRadius:'50px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', color:'#EA580C', fontWeight:700, fontSize:10.5, letterSpacing:'0.5px', marginBottom:12}} className="load-item-1">
              PUSAT BANTUAN
            </span>
            <h1 className="font-space load-item-2" style={{fontSize:'clamp(32px, 7vw, 48px)', fontWeight:900, color: '#1A0D05', marginBottom:10, letterSpacing: '-1px'}}>
              SUPPORT CENTER
            </h1>
            <p style={{color:'#EA580C', opacity: 0.85, fontSize:14.5, fontWeight: 500}} className="load-item-3">{serverName} — Tim kami siap melayani kendala Anda secara responsif.</p>
          </div>

          {/* NAVIGATION TABS (STAGGERED LOAD) */}
          <div style={{display:'flex', justifyContent:'center', gap:8, marginBottom:36, maxWidth:360, margin:'0 auto 36px'}} className={isLoaded ? 'load-animate loaded' : 'load-animate'}>
            <button className={`support-nav-tab load-item-4 ${view==='home'||view==='form'?'active':''}`} onClick={()=>setView('home')}>
              <Icon name="plus-circle" size={13} /> <span>Buat Tiket</span>
            </button>
            <button className={`support-nav-tab load-item-4 ${view==='tickets'||view==='chat'?'active':''}`} onClick={()=>{ setView('tickets'); loadTickets(); }}>
              <Icon name="list-check" size={13} /> <span>Tiket Saya</span>
            </button>
          </div>

          {/* ── VIEW HOME: SELECT CATEGORY TICKET ── */}
          {view === 'home' && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14}}>
              {!player && (
                <div style={{gridColumn:'1/-1', background:'rgba(249,115,22,0.04)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, marginBottom:4}} className="scroll-animate visible">
                  <Icon name="circle-exclamation" size={16} color="#F97316"/>
                  <p style={{fontSize:13, color:'#EA580C', fontWeight:500}}>
                    Anda wajib <strong style={{color:'#F97316', cursor:'pointer', textDecoration:'underline'}} onClick={()=>setShowLogin(true)}>Login Akun</strong> terlebih dahulu untuk mengajukan tiket bantuan.
                  </p>
                </div>
              )}
              {TYPES.map(t=>(
                <button key={t.id} onClick={()=>handleSelectType(t.id)} className="support-cat-card scroll-animate" style={{width:'100%', textAlign:'left', background:'#FFFFFF', border: '1px solid rgba(249,115,22,0.25)', borderRadius:14, padding:16, display:'flex', alignItems:'center', gap:14, cursor:'pointer', transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'}}>
                  <div style={{background:`rgba(249,115,22,0.08)`, color:'#F97316', width:38, height:38, borderRadius:8, display:'flex', alignItems:'center', justifyOrigin:'center', justifyContent:'center', border:'1px solid rgba(249,115,22,0.15)', flexShrink:0}}>
                    <Icon name={t.icon} size={15}/>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <p style={{fontWeight:800, fontSize:14, color:'#1A0D05', marginBottom:2}}>{t.label}</p>
                    <p style={{fontSize:12, color:'#EA580C', opacity:0.8, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis'}}>{t.desc}</p>
                  </div>
                  <Icon name="chevron-right" size={11} color="#F97316" style={{marginLeft:'auto', flexShrink:0}}/>
                </button>
              ))}
            </div>
          )}

          {/* ── VIEW FORM SUBMISSION ── */}
          {view === 'form' && typeInfo && (
            <div style={{background:'#FFFFFF', border:'1px solid rgba(249,115,22,0.25)', borderRadius:16, padding:'28px'}} className="scroll-animate visible">
              <button onClick={()=>setView('home')} style={{background:'none', border:'none', color:'#EA580C', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, marginBottom:20}}>
                <Icon name="arrow-left" size={12}/> Kembali
              </button>

              <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:24, background:'rgba(249,115,22,0.03)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:12, padding:'14px 18px'}}>
                <div style={{background:`rgba(249,115,22,0.08)`, color:'#F97316', width:40, height:40, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, border:'1px solid rgba(249,115,22,0.15)'}}>
                  <Icon name={typeInfo.icon} size={15}/>
                </div>
                <div>
                  <p className="font-space" style={{fontWeight:800, fontSize:15, color:'#1A0D05'}}>{typeInfo.label}</p>
                  <p style={{fontSize:12, color:'#EA580C', fontWeight:500}}>
                    Pelapor: <strong style={{color:'#F97316'}}>{player?.displayName||player?.username}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:18}}>
                {selType==='report_player' && (
                  <div>
                    <label className="orange-form-label">Username Pemain Yang Dilaporkan *</label>
                    <input value={form.target_player} onChange={e=>setForm(p=>({...p,target_player:e.target.value}))}
                      className="orange-form-input" placeholder="Contoh: SteveGamer_ID" required/>
                  </div>
                )}
                <div>
                  <label className="orange-form-label">Subjek Masalah *</label>
                  <input value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}
                    className="orange-form-input" placeholder="Tuliskan ringkasan pokok kendala..." required maxLength={200}/>
                </div>
                <div>
                  <label className="orange-form-label">Deskripsi Kronologi Lengkap *</label>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                    className="orange-form-input" rows={5} placeholder="Jelaskan secara rinci detail agar tim admin mudah memahami..." required
                    style={{resize:'vertical', minHeight:120}}/>
                </div>
                <div>
                  <label className="orange-form-label">Tautan / Link Bukti Screenshot <span style={{fontWeight:500, textTransform:'none', color:'#EA580C', opacity:0.7}}>(Opsional)</span></label>
                  <input value={form.evidence_url} onChange={e=>setForm(p=>({...p,evidence_url:e.target.value}))}
                    className="orange-form-input" placeholder="https://imgur.com/example..."/>
                </div>
                <button type="submit" className="orange-submit-ticket-btn" disabled={sending} style={{border:'none', cursor:'pointer', width:'100%', marginTop:6}}>
                  {sending
                    ? <><span className="orange-btn-spinner"/> Memproses Kiriman...</>
                    : <><Icon name="paper-plane" size={13}/> Kirim Tiket Sekarang</>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── VIEW TICKETS LIST ── */}
          {view === 'tickets' && (
            <div>
              {!player ? (
                <div style={{textAlign:'center', padding:'60px 0', background:'#FFFFFF', border:'1px solid rgba(249,115,22,0.15)', borderRadius:16}} className="scroll-animate visible">
                  <Icon name="lock" size={32} color="#F97316" style={{display:'block', margin:'0 auto 14px'}}/>
                  <p style={{color:'#EA580C', marginBottom:16, fontSize:14, fontWeight:600}}>Harap masuk akun untuk meninjau riwayat tiket Anda.</p>
                  <button className="orange-submit-ticket-btn" style={{border:'none', cursor:'pointer', display:'inline-flex', margin:'0 auto'}} onClick={()=>setShowLogin(true)}>
                    <Icon name="right-to-bracket" size={13}/> Login Akun
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 0', background:'#FFFFFF', border:'1px solid rgba(249,115,22,0.15)', borderRadius:16}} className="scroll-animate visible">
                  <Icon name="inbox" size={32} color="#F97316" style={{display:'block', margin:'0 auto 14px'}}/>
                  <p style={{color:'#EA580C', marginBottom:14, fontSize:14, fontWeight:600}}>Belum ada tiket bantuan yang terdaftar.</p>
                  <button className="orange-secondary-btn" onClick={()=>setView('home')}>
                    <Icon name="plus" size={12}/> Buat Tiket Baru
                  </button>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:14}}>
                  {tickets.map(tk => {
                    const t  = TYPES.find(x=>x.id===tk.type);
                    const st = STATUS[tk.status] || STATUS.open;
                    return (
                      <div key={tk.ticket_id} className="support-ticket-item-card scroll-animate"
                        style={{padding:'18px 22px', cursor:'pointer', background:'#FFFFFF', border:'1px solid rgba(249,115,22,0.25)', borderRadius:14}}
                        onClick={()=>handleOpenChat(tk)}>
                        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10}}>
                          <div style={{display:'flex', alignItems:'center', gap:12, minWidth:0}}>
                            <div style={{width:36, height:36, borderRadius:8, background:`rgba(249,115,22,0.08)`, border:'1px solid rgba(249,115,22,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                              <Icon name={t?.icon||'ticket'} size={14} color="#F97316"/>
                            </div>
                            <div style={{minWidth:0}}>
                              <p style={{fontWeight:800, fontSize:14, color:'#1A0D05', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{tk.subject}</p>
                              <code style={{fontSize:11, color:'#EA580C', opacity:0.8, fontFamily:'monospace'}}>{tk.ticket_id}</code>
                            </div>
                          </div>
                          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0}}>
                            <span style={{background: st.bg, color: st.color, border:`1px solid ${st.color}35`, padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:800}}>
                              {st.label}
                            </span>
                            <span style={{fontSize:10.5, color:'#EA580C', opacity:0.7, fontWeight:500}}>{fmt(tk.updated_at||tk.created_at)}</span>
                          </div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid rgba(249,115,22,0.08)'}}>
                          <p style={{fontSize:12, color:'#EA580C', display:'flex', alignItems:'center', gap:6, fontWeight:500}}>
                            <Icon name="comment-dots" size={13}/>
                            {tk.messages?.length || 0} pesan terkirim
                          </p>
                          <span style={{fontSize:12, color:'#F97316', fontWeight:700, display:'flex', alignItems:'center', gap:4}}>
                            Buka Chat <Icon name="arrow-right" size={10}/>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── VIEW TICKET CHAT CONVERSATION ── */}
          {view === 'chat' && (
            <div style={{background:'#FFFFFF', border:'1px solid rgba(249,115,22,0.25)', borderRadius:16, overflow:'hidden'}} className="scroll-animate visible">
              {/* Chat Header Bar */}
              <div style={{padding:'16px 20px', borderBottom:'1px solid rgba(249,115,22,0.12)', display:'flex', alignItems:'center', gap:12, background:'rgba(249,115,22,0.01)'}}>
                <button onClick={()=>{ setView('tickets'); loadTickets(); }}
                  style={{background:'none', border:'none', color:'#EA580C', cursor:'pointer', padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700}}>
                  <Icon name="arrow-left" size={13}/> Kembali
                </button>
                {activeTicket && (
                  <>
                    <div style={{width:1, height:20, background:'rgba(249,115,22,0.2)'}}/>
                    <div style={{width:30, height:30, borderRadius:6, background:`rgba(249,115,22,0.08)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                      <Icon name={chatType?.icon||'ticket'} size={13} color="#F97316"/>
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{fontWeight:800, fontSize:13, color:'#1A0D05', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{activeTicket.subject}</p>
                      <code style={{fontSize:10, color:'#EA580C', opacity:0.8}}>{activeTicket.ticket_id}</code>
                    </div>
                    <span style={{background: chatStatus?.bg, color: chatStatus?.color, border:`1px solid ${chatStatus?.color}35`, padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:800, flexShrink:0}}>
                      {chatStatus?.label}
                    </span>
                    {/* Live Stream Status Indicator */}
                    <div style={{flexShrink:0}}>
                      <span style={{display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:sseStatus==='live'?'#16A34A':sseStatus==='polling'?'#D97706':'#EA580C'}}>
                        <span style={{width:6, height:6, borderRadius:'50%', background:sseStatus==='live'?'#16A34A':sseStatus==='polling'?'#D97706':'#EA580C', display:'inline-block', animation:sseStatus==='live'?'pulse-dot 2s infinite':undefined}}/>
                        {sseStatus==='live'?'Live':sseStatus==='polling'?'Poll':'...'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Chat Messages Log Area */}
              <div style={{minHeight:320, maxHeight:'52vh', overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:14, background:'#FFFFFF'}}>
                {loadingChat ? (
                  <div style={{textAlign:'center', padding:'40px 0', color:'#F97316'}}>
                    <Icon name="spinner" size={24} spin/>
                  </div>
                ) : activeTicket && (
                  <>
                    {activeTicket.evidence_url && (
                      <div style={{background:'rgba(249,115,22,0.04)', border:'1px dashed rgba(249,115,22,0.25)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#1A0D05', fontWeight:500}}>
                        <Icon name="link" size={12} style={{marginRight:6}} color="#F97316"/>
                        Tautan Bukti: <a href={activeTicket.evidence_url} target="_blank" rel="noopener noreferrer" style={{color:'#F97316', textDecoration:'underline', fontWeight:700}}>{activeTicket.evidence_url}</a>
                      </div>
                    )}
                    
                    {(activeTicket.messages||[]).map((msg,i) => {
                      const isAdmin  = msg.sender_type === 'admin';
                      const isPending = !!msg._pending;
                      return (
                        <div key={msg.id||i} style={{display:'flex', flexDirection:'column', alignItems: isAdmin ? 'flex-start' : 'flex-end'}}>
                          <div style={{
                            maxWidth:'80%',
                            background: isAdmin ? 'rgba(249,115,22,0.04)' : isPending ? 'rgba(234,88,12,0.02)' : '#FFF1E6',
                            border: isAdmin ? '1px solid rgba(249,115,22,0.25)' : isPending ? '1px dashed rgba(234,88,12,0.3)' : '1px solid rgba(249,115,22,0.15)',
                            borderRadius: isAdmin ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
                            padding:'10px 14px',
                            opacity: isPending ? 0.7 : 1,
                          }}>
                            <p style={{fontSize:11, fontWeight:800, color: isAdmin ? '#EA580C' : '#F97316', marginBottom:4}}>
                              {isAdmin ? '🛡️ Admin Server' : `👤 ${msg.sender}`}
                            </p>
                            <p style={{fontSize:13, color:'#1A0D05', lineHeight:1.5, whiteSpace:'pre-wrap', fontWeight:500}}>{msg.text}</p>
                          </div>
                          <p style={{fontSize:10, color:'#EA580C', opacity:0.7, marginTop:4, padding:'0 4px', fontWeight:500}}>
                            {isPending ? '⏳ Mengirim...' : fmt(msg.created_at)}
                          </p>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef}/>
                  </>
                )}
              </div>

              {/* Chat Input Box */}
              <div style={{padding:'14px 16px', borderTop:'1px solid rgba(249,115,22,0.12)', background:'rgba(249,115,22,0.01)'}}>
                {isClosed ? (
                  <div style={{textAlign:'center', padding:'8px', color:'#DC2626', fontSize:13, fontWeight:700, background:'rgba(220,38,38,0.05)', borderRadius:8}}>
                    <Icon name="lock" size={12} style={{marginRight:6}}/>
                    Tiket bantuan ini telah ditutup. Percakapan baru tidak dapat dikirim kembali.
                  </div>
                ) : (
                  <div style={{display:'flex', gap:10}}>
                    <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} rows={2}
                      placeholder="Ketik balasan pesan Anda di sini..."
                      onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) handleSendMessage(); }}
                      className="orange-form-input" style={{flex:1, resize:'none', fontSize:13, padding:'10px 14px', margin:0}}/>
                    <button onClick={handleSendMessage} disabled={sendingMsg||!newMsg.trim()}
                      className="orange-submit-ticket-btn" style={{flexShrink:0, alignSelf:'flex-end', padding:'12px 18px', border:'none', cursor:'pointer'}}>
                      {sendingMsg?<Icon name="spinner" size={13} spin/>:<><Icon name="paper-plane" size={13}/> Balas</>}
                    </button>
                  </div>
                )}
                {!isClosed && <p style={{fontSize:10.5, color:'#EA580C', opacity:0.7, marginTop:6, fontWeight:500}}>Tekan <kbd style={{fontFamily:'sans-serif', background:'rgba(249,115,22,0.1)', padding:'2px 4px', borderRadius:4}}>Ctrl + Enter</kbd> untuk berkirim pesan secara cepat.</p>}
              </div>
            </div>
          )}

        </main>

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

      {/* CORE CSS ENGINE ANIMATIONS */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .gpu-glow-layer {
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        /* ---------------------------------------------
           1. STAGGERED INITIAL PAGE LOAD FADE-IN
        --------------------------------------------- */
        .load-animate [class^="load-item-"] {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .load-animate.loaded .load-item-1 { opacity: 1; transform: translateY(0); transition-delay: 40ms; }
        .load-animate.loaded .load-item-2 { opacity: 1; transform: translateY(0); transition-delay: 100ms; }
        .load-animate.loaded .load-item-3 { opacity: 1; transform: translateY(0); transition-delay: 160ms; }
        .load-animate.loaded .load-item-4 { opacity: 1; transform: translateY(0); transition-delay: 220ms; }

        /* ---------------------------------------------
           2. INTERSECTION OBSERVER SCROLL
        --------------------------------------------- */
        .scroll-animate {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .scroll-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* NAV STYLING TAB BUTTONS */
        .support-nav-tab {
          background: #FFFFFF;
          border: 1px solid rgba(249,115,22,0.25);
          color: #EA580C;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .support-nav-tab:hover, .support-nav-tab.active {
          background: #F97316;
          border-color: #F97316;
          color: #FFFFFF;
          box-shadow: 0 4px 14px rgba(249,115,22,0.18);
        }

        /* CARD SUPPORT HOVER */
        .support-cat-card:hover, .support-ticket-item-card:hover {
          border-color: #F97316 !important;
          background: rgba(249,115,22,0.01) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249,115,22,0.05);
        }

        /* PREMIUM ORANGE INPUTS & TEXTAREAS */
        .orange-form-label {
          display: block;
          font-weight: 700;
          color: #1A0D05;
          font-size: 12.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 8px;
        }
        .orange-form-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid rgba(249,115,22,0.25);
          background: #FFFFFF;
          font-size: 13.5px;
          color: #1A0D05;
          font-weight: 500;
          outline: none;
          transition: all 0.15s ease;
        }
        .orange-form-input:focus {
          border-color: #F97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.08);
        }

        /* ACTIONS BUTTON */
        .orange-submit-ticket-btn {
          background: #F97316;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13.5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .orange-submit-ticket-btn:hover {
          background: #EA580C;
        }
        .orange-submit-ticket-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .orange-secondary-btn {
          background: none;
          border: 1px solid rgba(249,115,22,0.25);
          color: #F97316;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s;
        }
        .orange-secondary-btn:hover {
          background: rgba(249,115,22,0.03);
          border-color: #F97316;
        }

        /* SPINNER EXTRAS */
        .orange-btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #FFFFFF;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(22,163,74, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(22,163,74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74, 0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
