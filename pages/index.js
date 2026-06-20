import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import FancyFooter from '../components/FancyFooter';

const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch { return { props: { settings: {} } }; }
}

export default function HomePage({ settings }) {
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp   = s.server_ip   || 'fancynet.my.id';
  const { src: logoSrc } = useTransparentLogo();

  const [player,    setPlayer]    = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied,    setCopied]    = useState('');
  const [status,    setStatus]    = useState(null);

  useEffect(() => {
    try { const r=localStorage.getItem('mc_player'); if(r) setPlayer(JSON.parse(r)); } catch{}
    fetch('/api/server/status').then(r=>r.json()).then(setStatus).catch(()=>{});
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(label);
    toast.success(`${label} "${text}" berhasil disalin!`);
    setTimeout(() => setCopied(''), 2500);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
    setPlayer(null);
    localStorage.removeItem('mc_player');
    toast.success('Berhasil keluar');
  };

  const handleLoginSuccess = (p) => {
    setPlayer(p);
    localStorage.setItem('mc_player', JSON.stringify(p));
    setShowLogin(false);
  };

  const socials = [
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    icon:'star',     label:'Vote Server' },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, icon:'discord',  label:'Discord' },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,icon:'whatsapp', label:'WhatsApp' },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  icon:'tiktok',   label:'TikTok' },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      {/* BASE BACKGROUND AMBIENT ORANGE */}
      <div className="orange-theme-wrapper page-fade-in" style={{ backgroundColor: '#0B0A0A', color: '#F4F4F5', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Neon Ambient Glow (Murni GPU, 0% CPU Load) */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-15%', left: '15%', width: '650px', height: '650px', background: 'radial-gradient(circle, rgba(255,107,0,0.18) 0%, transparent 70%)', filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(234,88,12,0.12) 0%, transparent 70%)', filter: 'blur(90px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          
          {/* HERO SECTION */}
          <header style={{ padding: '130px 24px 60px', textAlign: 'center', position: 'relative' }}>
            <div style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 0 25px rgba(255,107,0,0.45))' }}>
              {s.logo_url ? <img src={s.logo_url} style={{maxWidth:140, margin:'0 auto'}} alt="Server Logo"/> : <LogoImage style={{width:130, margin:'0 auto'}}/>}
            </div>

            <div style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: '50px', background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)', color: '#FF8A00', fontWeight: 700, fontSize: 11, marginBottom: 20, letterSpacing: '0.5px' }}>
              SERVER EKONOMI | JAVA & BEDROCK
            </div>

            <h1 className="hero-title-float" style={{ fontSize: 'clamp(36px, 7vw, 60px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 20, maxWidth: 850, margin: '0 auto 20px', lineHeight: 1.15 }}>
              {s.hero_title || <>Mulai Petualanganmu di <span style={{ background: 'linear-gradient(135deg, #FF6B00, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{serverName}</span></>}
            </h1>

            {/* Floating Info Version & Port Kiri Kanan khas Shadowyn Style */}
            <div className="floating-info-container">
              <div className="floating-info-badge badge-left">
                <span>PORT BEDROCK</span>
                <strong>19015</strong>
              </div>
              <div className="floating-info-badge badge-right">
                <span>VERSION</span>
                <strong>1.21+</strong>
              </div>
            </div>

            <p style={{ color: '#A1A1AA', fontSize: 16, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
              {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid dan dunia tanpa batas.'}
            </p>

            {/* Status Player Online */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '99px', backgroundColor: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', fontSize: 13, fontWeight: 600, color: '#FF8A00', marginBottom: 36 }}>
              <div style={{ width: 8, height: 8, backgroundColor: '#FF6B00', borderRadius: '50%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FF6B00', borderRadius: '50%', transform: 'scale(1.8)', opacity: 0.5, animation: 'ping-orange 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              </div>
              <span><strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{playerCount}</strong> Players Online</span>
            </div>

            {/* TRIPLE IP GRID — Kotak Terlihat Jelas & Kontras */}
            <div className="ip-grid scroll-animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 800, margin: '0 auto 36px' }}>
              {[
                { label: 'Java Edition IP', addr: serverIp, icon: 'computer', copy: serverIp, copyLabel: 'IP Java' },
                { label: 'Bedrock Edition IP', addr: serverIp, icon: 'mobile', copy: serverIp, copyLabel: 'IP Bedrock' },
                { label: 'Bedrock Port', addr: '19015', icon: 'network-wired', copy: '19015', copyLabel: 'Port Bedrock' },
              ].map((item, i) => (
                <div key={i} className="card-orange" onClick={() => copyIP(item.copy, item.copyLabel)}>
                  <span className="orange-copy-indicator">{copied === item.copyLabel ? '✓ Disalin' : 'Salin'}</span>
                  <div className="icon-orange"><Icon name={item.icon} size={18} /></div>
                  <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                    <span className="orange-card-label">{item.label}</span>
                    <span className="orange-card-addr">{item.addr}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SOCIAL MEDIA ROW */}
            {socials.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }} className="scroll-animate">
                {socials.map((x, i) => (
                  <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="orange-social-btn">
                    <Icon name={x.icon} size={15} />
                    <span>{x.label}</span>
                  </a>
                ))}
              </div>
            )}
          </header>

          {/* LOWER CONTAINER - Melengkung Halus */}
          <div style={{ backgroundColor: '#110F0E', borderRadius: '40px 40px 0 0', borderTop: '1px solid #1F1C1A', padding: '60px 24px 20px' }}>
            
            {/* STATS BAR */}
            <section style={{ paddingBottom: 60 }} className="scroll-animate">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 20, maxWidth: 800, margin: '0 auto' }} className="stats-grid">
                {[
                  { val: '24/7', sub: 'Server Online' },
                  { val: 'JAVA', sub: '+ Bedrock' },
                  { val: 'FREE', sub: 'Untuk Semua' },
                  { val: 'ID', sub: 'Community' },
                ].map((st, i) => (
                  <div key={i} style={{ background: '#161413', border: '1px solid #282422', padding: '18px 12px', borderRadius: '16px' }}>
                    <h3 className="font-space" style={{ fontSize: 26, color: '#FF6B00', fontWeight: 800 }}>{st.val}</h3>
                    <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{st.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FEATURES */}
            <section style={{ paddingBottom: 60, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <span style={{ color: '#FF6B00', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', marginBottom: 6 }}>FITUR UTAMA</span>
                <h2 className="font-space" style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>Keunggulan Bermain di <span style={{ color: '#FF6B00' }}>Fancy</span></h2>
              </div>
              
              <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {[
                  { icon: 'shield-halved', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.' },
                  { icon: 'users', title: 'Komunitas Solid', desc: 'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.' },
                  { icon: 'bolt', title: 'Low Latency', desc: 'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.' },
                  { icon: 'trophy', title: 'Event & Reward', desc: 'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.' },
                ].map((f, i) => (
                  <div key={i} className="card-orange" style={{ padding: 22, textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'default' }}>
                    <div className="icon-orange" style={{ marginBottom: 0 }}><Icon name={f.icon} size={18} /></div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>{f.title}</h4>
                      <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* RECRUITMENT */}
            <section style={{ paddingBottom: 60, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
              <div style={{ backgroundColor: '#161413', border: '1px solid #282422', borderRadius: 24, padding: '36px 28px', maxWidth: 540, margin: '0 auto' }}>
                <span style={{ color: '#FF6B00', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>KONTRIBUSI &amp; REWARD</span>
                <h3 className="font-space" style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 12 }}>Rank Famous Creator</h3>
                <p style={{ fontSize: 13.5, color: '#A1A1AA', marginBottom: 24, lineHeight: 1.6 }}>
                  Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0' }}>
                  {['Tidak memiliki masalah dengan server lain', 'Membuat konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun'].map((r, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#E4E4E7', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon name="circle-check" size={14} color="#FF6B00" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
                <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="orange-apply-btn">
                  <span>Apply Requirement</span>
                  <Icon name="arrow-right" size={14} />
                </a>
              </div>
            </section>

          </div>
        </main>

        <FancyFooter serverName={serverName} />
        
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      {/* STYLES CSS MURNI DIJALANKAN OLEH GPU — PERFORMA 100% */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* Animasi Transisi Halaman (Home <-> Store) */
        .page-fade-in {
          animation: pageIn 0.35s cubic-bezier(0.215, 0.610, 0.355, 1) forwards;
          will-change: opacity, transform;
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Animasi Scroll Viewport */
        .scroll-animate {
          animation: slideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Animasi Hero Title Floating */
        .hero-title-float {
          animation: floatTitle 4s ease-in-out infinite;
        }
        @keyframes floatTitle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        /* STRUKTUR BOX KOTAK CARD: JELAS, TEGAS & AMBIENT */
        .card-orange {
          background: #161413; /* Warna Cokelat Gelap Warm agar Kotak Tampak Jelas */
          border: 1px solid #2A2421; /* Border tegas pemisah warna background luar */
          border-radius: 14px;
          padding: 14px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-orange:hover {
          background: #1C1917;
          border-color: #FF6B00; /* Menyala Orange Tebal saat Kursor di Atas */
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 107, 0, 0.12);
        }

        .orange-copy-indicator {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 9px;
          color: #FF8A00;
          background: rgba(255,107,0,0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .icon-orange {
          width: 38px;
          height: 38px;
          background: rgba(255,107,0,0.08);
          color: #FF6B00;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(255,107,0,0.15);
        }
        .orange-card-label {
          font-size: 9px;
          text-transform: uppercase;
          color: #8C8480; /* Kontras dinaikkan */
          font-weight: 700;
          letter-spacing: 0.5px;
          display: block;
        }
        .orange-card-addr {
          font-size: 14px;
          font-weight: 800;
          color: #FFFFFF;
          display: block;
          margin-top: 1px;
        }

        .orange-social-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          background: #161413;
          border: 1px solid #2A2421;
          color: #E4E4E7;
          transition: all 0.15s ease;
        }
        .orange-social-btn:hover {
          background: rgba(255,107,0,0.05);
          border-color: #FF6B00;
          color: #FFFFFF;
        }

        .orange-apply-btn {
          background: #FF6B00;
          color: #FFFFFF;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .orange-apply-btn:hover {
          background: #E05E00;
        }

        /* Floating Badge Khas Desain Screenshot */
        .floating-info-container {
          position: absolute;
          width: 100%;
          max-width: 580px;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .floating-info-badge {
          position: absolute;
          background: rgba(22, 20, 19, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.04);
          padding: 6px 12px;
          border-radius: 12px;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .badge-left { left: -30px; top: 0; transform: rotate(-6deg); }
        .badge-right { right: -30px; top: -10px; transform: rotate(4deg); }

        @keyframes ping-orange {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @media(max-width: 768px) {
          .ip-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .floating-info-container { display: none; }
        }
      `}</style>
    </>
  );
}
