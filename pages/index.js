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
  const serverIp   = 'play.fancynet.my.id'; // Diperbarui sesuai request
  const bedrockPort = '19026';               // Diperbarui sesuai request
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

      {/* LIGHT SAAS TECH DASHBOARD STYLE */}
      <div className="orange-theme-wrapper page-fade-in" style={{ backgroundColor: '#FFFFFF', color: '#18181B', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Sangat Redup Soft Glow (Hanya pembiasan estetik di background putih) */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} className="gpu-glow-layer">
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '450px', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '-10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(249,115,22,0.02) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0 16px' }}>
          
          {/* HERO SECTION */}
          <header style={{ padding: '130px 0 50px', textAlign: 'center' }}>
            <div style={{ margin: '0 auto 20px' }}>
              {s.logo_url ? <img src={s.logo_url} style={{maxWidth:130, margin:'0 auto'}} alt="Server Logo"/> : <LogoImage style={{width:120, margin:'0 auto'}}/>}
            </div>

            <div style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: '50px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#EA580C', fontWeight: 700, fontSize: 11, marginBottom: 20, letterSpacing: '0.5px' }}>
              SERVER EKONOMI | JAVA & BEDROCK
            </div>

            <h1 style={{ fontSize: 'clamp(30px, 6.5vw, 52px)', fontWeight: 850, color: '#09090B', marginBottom: 16, maxWidth: 850, margin: '0 auto 16px', lineHeight: 1.15, letterSpacing: '-0.75px' }}>
              {s.hero_title || <>Mulai Petualanganmu di <span style={{ color: '#F97316' }}>{serverName}</span></>}
            </h1>

            <p style={{ color: '#71717A', fontSize: 15, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.55 }}>
              {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid dan dunia tanpa batas.'}
            </p>

            {/* Status Player Online */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '99px', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', fontSize: 13, fontWeight: 600, color: '#27272A', marginBottom: 40 }}>
              <div style={{ width: 8, height: 8, backgroundColor: '#F97316', borderRadius: '50%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: '#F97316', borderRadius: '50%', transform: 'scale(1.8)', opacity: 0.4, animation: 'ping-orange 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              </div>
              <span><strong style={{ color: '#F97316', fontWeight: 800 }}>{playerCount}</strong> Players Online</span>
            </div>

            {/* TRIPLE IP GRID — PREMIUM SAAS CARD */}
            <div className="ip-grid scroll-animate" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 800, margin: '0 auto 36px' }}>
              {[
                { label: 'Java Edition IP', addr: serverIp, icon: 'computer', copy: serverIp, copyLabel: 'IP Java' },
                { label: 'Bedrock Edition IP', addr: serverIp, icon: 'mobile', copy: serverIp, copyLabel: 'IP Bedrock' },
                { label: 'Bedrock Port', addr: bedrockPort, icon: 'network-wired', copy: bedrockPort, copyLabel: 'Port Bedrock' },
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
                    <Icon name={x.icon} size={14} />
                    <span>{x.label}</span>
                  </a>
                ))}
              </div>
            )}
          </header>

          {/* STATS BAR */}
          <section style={{ backgroundColor: '#F4F4F5', borderTop: '1px solid #E4E4E7', borderBottom: '1px solid #E4E4E7', padding: '24px 24px', margin: '0 -16px 60px' }} className="scroll-animate">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 16, maxWidth: 800, margin: '0 auto' }} className="stats-grid">
              {[
                { val: '24/7', sub: 'Server Online' },
                { val: 'JAVA', sub: '+ Bedrock' },
                { val: 'FREE', sub: 'Untuk Semua' },
                { val: 'ID', sub: 'Community' },
              ].map((st, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', padding: '14px 8px', borderRadius: '12px' }}>
                  <h3 className="font-space" style={{ fontSize: 24, color: '#F97316', fontWeight: 800 }}>{st.val}</h3>
                  <p style={{ fontSize: 10, color: '#71717A', marginTop: 3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{st.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURES */}
          <section style={{ paddingBottom: 60, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <span style={{ color: '#F97316', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', marginBottom: 4 }}>FITUR UTAMA</span>
              <h2 className="font-space" style={{ fontSize: 24, fontWeight: 800, color: '#09090B' }}>Keunggulan Bermain di <span style={{ color: '#F97316' }}>Fancy</span></h2>
            </div>
            
            <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { icon: 'shield-halved', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.' },
                { icon: 'users', title: 'Komunitas Solid', desc: 'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.' },
                { icon: 'bolt', title: 'Low Latency', desc: 'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.' },
                { icon: 'trophy', title: 'Event & Reward', desc: 'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.' },
              ].map((f, i) => (
                <div key={i} className="card-orange" style={{ padding: 20, textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'default' }}>
                  <div className="icon-orange" style={{ marginBottom: 0 }}><Icon name={f.icon} size={18} /></div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', marginBottom: 4 }}>{f.title}</h4>
                    <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RECRUITMENT */}
          <section style={{ paddingBottom: 80, maxWidth: 800, margin: '0 auto' }} className="scroll-animate">
            <div style={{ backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', borderRadius: 16, padding: '36px 24px', maxWidth: 540, margin: '0 auto' }}>
              <span style={{ color: '#F97316', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>KONTRIBUSI &amp; REWARD</span>
              <h3 className="font-space" style={{ fontSize: 20, fontWeight: 800, color: '#09090B', marginBottom: 10 }}>Rank Famous Creator</h3>
              <p style={{ fontSize: 13.5, color: '#71717A', marginBottom: 20, lineHeight: 1.55 }}>
                Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                {['Tidak memiliki masalah dengan server lain', 'Membuat konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun'].map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#27272A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="circle-check" size={14} color="#F97316" />
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

        </main>

        <FancyFooter serverName={serverName} />
        
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      {/* STYLES INTERFACE SAAS CLEAN */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        .gpu-glow-layer {
          will-change: transform, opacity;
          transform: translateZ(0);
        }

        .page-fade-in {
          animation: pageIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: opacity, transform;
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .scroll-animate {
          animation: slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* CARD SAAS: DASHBOARD TECH CLEAN LOOK */
        .card-orange {
          background: #FFFFFF;
          border: 1px solid #E4E4E7; /* Abu-abu peredam */
          border-radius: 12px;
          padding: 13px 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .card-orange:hover {
          border-color: #F97316; /* Menyala aksen Orange Terang */
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(249, 115, 22, 0.05);
        }

        .orange-copy-indicator {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 9px;
          color: #EA580C;
          background: rgba(249,115,22,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .icon-orange {
          width: 36px;
          height: 36px;
          background: rgba(249,115,22,0.06);
          color: #F97316;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(249,115,22,0.1);
        }
        .orange-card-label {
          font-size: 9px;
          text-transform: uppercase;
          color: #71717A;
          font-weight: 700;
          letter-spacing: 0.5px;
          display: block;
        }
        .orange-card-addr {
          font-size: 14px;
          font-weight: 700;
          color: #09090B;
          display: block;
          margin-top: 1px;
        }

        .orange-social-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          background: #FFFFFF;
          border: 1px solid #E4E4E7;
          color: #27272A;
          transition: all 0.15s ease;
        }
        .orange-social-btn:hover {
          border-color: #F97316;
          color: #F97316;
          background: rgba(249,115,22,0.02);
        }

        .orange-apply-btn {
          background: #F97316;
          color: #FFFFFF;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
          transition: background 0.15s;
        }
        .orange-apply-btn:hover {
          background: #EA580C;
        }

        @keyframes ping-orange {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }

        @media(max-width: 768px) {
          .ip-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .feature-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
      `}</style>
    </>
  );
}
