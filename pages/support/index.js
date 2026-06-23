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
  { id:'banding',       icon:'gavel',        label:'Aju Banding',   desc:'Ajukan banding untuk keputusan admin / akun banned' },
  { id:'bug',           icon:'bug',          label:'Report Bug',    desc:'Temukan bug atau masalah teknis? Laporkan di sini' },
  { id:'report_player', icon:'user-xmark',   label:'Report Pemain', desc:'Laporkan pemain yang melanggar aturan server' },
  { id:'lainnya',       icon:'comment-dots', label:'Lainnya',       desc:'Pertanyaan umum, saran, atau feedback lainnya' },
];

const STATUS = {
  open:      { label:'Menunggu' },
  in_review: { label:'Direview' },
  resolved:  { label:'Selesai'  },
  rejected:  { label:'Ditolak'  },
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
  const chatStatusId = activeTicket ? (STATUS[activeTicket.status] ? activeTicket.status : 'open') : null;
  const isClosed = activeTicket?.status === 'resolved' || activeTicket?.status === 'rejected';

  return (
    <>
      <Head>
        <title>{`Support — ${serverName}`}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Support Center ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      {/* Pembungkus Utama Menggunakan Flexbox untuk Menata Footer */}
      <div className="support-page-wrap">

        <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        {/* Konten Utama: flex:1 mendorong footer ke bawah & max-width proporsional */}
        <main className="support-main">

          {/* Header */}
          <div className="support-header" data-anim="fade-up">
            <span className="fn-recruit-eyebrow">PUSAT BANTUAN</span>
            <h1 className="font-space support-title">
              Support <span className="fn-logo-brand">Center</span>
            </h1>
            <p className="support-subtitle">{serverName} — Tim kami siap membantu kamu</p>
          </div>

          {/* Nav tabs */}
          <div className="tabs-container support-tabs">
            <button className={`tab-btn${view==='home'||view==='form'?' active':''}`}
              onClick={()=>setView('home')}>
              <Icon name="plus-circle" size={14} className="fn-icon-mr"/> Buat Tiket
            </button>
            <button className={`tab-btn${view==='tickets'||view==='chat'?' active':''}`}
              onClick={()=>{ setView('tickets'); loadTickets(); }}>
              <Icon name="list-check" size={14} className="fn-icon-mr"/> Tiket Saya
            </button>
          </div>

          {/* ── HOME: pilih tipe ── */}
          {view === 'home' && (
            <div className="support-type-grid">
              {!player && (
                <div className="support-login-banner">
                  <Icon name="circle-exclamation" size={18} color="var(--primary)"/>
                  <p className="support-login-text">
                    Kamu perlu <strong className="support-login-link" onClick={()=>setShowLogin(true)}>login</strong> untuk membuat tiket.
                  </p>
                </div>
              )}
              {TYPES.map(t=>(
                <button key={t.id} onClick={()=>handleSelectType(t.id)} className="support-cat-card support-cat-btn">
                  <div className={`cat-icon accent-${t.id}`}>
                    <Icon name={t.icon} size={16}/>
                  </div>
                  <div>
                    <p className="support-cat-title">{t.label}</p>
                    <p className="support-cat-desc">{t.desc}</p>
                  </div>
                  <Icon name="chevron-right" size={12} color="var(--text-muted)" className="support-cat-chevron"/>
                </button>
              ))}
            </div>
          )}

          {/* ── FORM ── */}
          {view === 'form' && typeInfo && (
            <div className="fn-card support-form-card" data-anim="fade-up">
              <button onClick={()=>setView('home')} className="support-back-btn">
                <Icon name="arrow-left" size={14} className="fn-icon-mr"/> Kembali
              </button>

              <div className="support-form-type-banner">
                <div className={`cat-icon accent-${typeInfo.id}`}>
                  <Icon name={typeInfo.icon} size={16}/>
                </div>
                <div>
                  <p className="font-space support-form-title">{typeInfo.label}</p>
                  <p className="support-form-login-as">
                    Login sebagai <strong className="support-form-login-name">{player?.displayName||player?.username}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="support-form">
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
                    className="fn-input support-textarea" rows={5} placeholder="Jelaskan masalahmu secara detail..." required/>
                </div>
                <div>
                  <label className="section-label">Link Bukti / Screenshot <span className="support-optional-label">(opsional)</span></label>
                  <input value={form.evidence_url} onChange={e=>setForm(p=>({...p,evidence_url:e.target.value}))}
                    className="fn-input" placeholder="https://imgur.com/..."/>
                </div>
                <button type="submit" className="btn-primary-fn support-submit-btn" disabled={sending}>
                  {sending
                    ? <><span className="fn-spinner fn-spinner-sm"/> Mengirim...</>
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
                <div className="support-empty-state">
                  <Icon name="lock" size={40} color="var(--text-muted)" className="support-empty-icon"/>
                  <p className="support-empty-text">Login untuk melihat tiketmu</p>
                  <button className="btn-primary-fn" onClick={()=>setShowLogin(true)}>
                    <Icon name="right-to-bracket" size={14} className="fn-icon-mr"/> Login
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div className="support-empty-state">
                  <Icon name="inbox" size={40} color="var(--text-muted)" className="support-empty-icon"/>
                  <p className="support-empty-text-sm">Belum ada tiket</p>
                  <button className="btn-ghost-fn" onClick={()=>setView('home')}>
                    <Icon name="plus" size={14} className="fn-icon-mr"/> Buat Tiket Baru
                  </button>
                </div>
              ) : (
                <div className="support-ticket-list">
                  {tickets.map(tk => {
                    const t  = TYPES.find(x=>x.id===tk.type);
                    const st = STATUS[tk.status] || STATUS.open;
                    const stId = STATUS[tk.status] ? tk.status : 'open';
                    return (
                      <div key={tk.ticket_id} className="fn-card animate-in support-ticket-card"
                        onClick={()=>handleOpenChat(tk)}>
                        <div className="support-ticket-top">
                          <div className="support-ticket-left">
                            <div className={`support-ticket-icon accent-${t?.id||'banding'}`}>
                              <Icon name={t?.icon||'ticket'} size={15}/>
                            </div>
                            <div className="support-ticket-info">
                              <p className="support-ticket-subject">{tk.subject}</p>
                              <code className="support-ticket-id">{tk.ticket_id}</code>
                            </div>
                          </div>
                          <div className="support-ticket-right">
                            <span className={`support-status-badge status-${stId}`}>
                              {st.label}
                            </span>
                            <span className="support-ticket-date">{fmt(tk.updated_at||tk.created_at)}</span>
                          </div>
                        </div>
                        <div className="support-ticket-bottom">
                          <p className="support-ticket-msgcount">
                            <Icon name="comment-dots" size={13}/>
                            {tk.messages?.length || 0} pesan
                          </p>
                          <span className="support-ticket-open">
                            <Icon name="arrow-right" size={10} className="fn-icon-ml-2"/> Buka Chat
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
            <div className="fn-card support-chat-card" data-anim="scale-pop">
              {/* Chat header */}
              <div className="support-chat-header">
                <button onClick={()=>{ setView('tickets'); loadTickets(); }} className="support-chat-back">
                  <Icon name="arrow-left" size={14} className="fn-icon-mr"/> Kembali
                </button>
                {activeTicket && (
                  <>
                    <div className="support-chat-divider"/>
                    <div className={`support-chat-type-icon accent-${chatType?.id||'banding'}`}>
                      <Icon name={chatType?.icon||'ticket'} size={13}/>
                    </div>
                    <div className="support-chat-info">
                      <p className="support-chat-subject">{activeTicket.subject}</p>
                      <code className="support-chat-id">{activeTicket.ticket_id}</code>
                    </div>
                    <span className={`support-status-badge status-${chatStatusId}`}>
                      {chatStatus?.label}
                    </span>
                    {/* SSE status indicator */}
                    <div title={sseStatus==='live'?'Realtime aktif':sseStatus==='polling'?'Mode polling':'Menghubungkan...'} className="support-sse-wrap">
                      <span className={`support-sse-status ${sseStatus}`}>
                        <span className={`support-sse-dot ${sseStatus}`}/>
                        {sseStatus==='live'?'Live':sseStatus==='polling'?'Polling':'...'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Messages area */}
              <div className="support-messages-area">
                {loadingChat ? (
                  <div className="support-chat-loading">
                    <Icon name="spinner" size={28} spin/>
                  </div>
                ) : activeTicket && (
                  <>
                    {/* Ticket info box */}
                    {activeTicket.evidence_url && (
                      <div className="support-evidence-box">
                        <Icon name="link" size={12} className="fn-icon-mr"/>
                        Bukti: <a href={activeTicket.evidence_url} target="_blank" rel="noopener noreferrer" className="support-evidence-link">{activeTicket.evidence_url}</a>
                      </div>
                    )}
                    {(activeTicket.messages||[]).map((msg,i) => {
                      const isAdmin  = msg.sender_type === 'admin';
                      const isPending = !!msg._pending;
                      const bubbleModifier = isAdmin ? 'admin' : isPending ? 'pending' : '';
                      return (
                        <div key={msg.id||i} className={`support-msg-row ${isAdmin?'admin':''}`}>
                          <div className={`support-msg-bubble ${bubbleModifier}`}>
                            <p className={`support-msg-sender ${isAdmin?'admin':''}`}>
                              {isAdmin ? '🛡️ Admin' : `👤 ${msg.sender}`}
                            </p>
                            <p className="support-msg-text">{msg.text}</p>
                          </div>
                          <p className="support-msg-time">
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
              <div className="support-chat-input-area">
                {isClosed ? (
                  <div className="support-chat-closed">
                    <Icon name="lock" size={12} className="fn-icon-mr"/>
                    Tiket ini sudah ditutup — tidak bisa mengirim pesan baru
                  </div>
                ) : (
                  <div className="support-chat-input-row">
                    <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} rows={2}
                      placeholder="Tulis pesanmu di sini..."
                      onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) handleSendMessage(); }}
                      className="fn-input support-chat-textarea"/>
                    <button onClick={handleSendMessage} disabled={sendingMsg||!newMsg.trim()}
                      className="btn-primary-fn support-chat-send">
                      {sendingMsg?<Icon name="spinner" size={14} spin/>:<><Icon name="paper-plane" size={14} className="fn-icon-mr"/> Kirim</>}
                    </button>
                  </div>
                )}
                {!isClosed && <p className="support-chat-hint">Ctrl+Enter untuk kirim cepat</p>}
              </div>
            </div>
          )}

        </main>

        {/* Footer Berada di Luar <main> namun di Dalam Pembungkus Flexbox, Menjamin Posisinya Selalu di Bawah */}
        <FancyFooter serverName={serverName} discordUrl={s.discord_url} />

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
