import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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
    
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 80);
    return () => { clearTimeout(t); document.body.classList.remove('page-loaded'); };
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
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    cls:'btn-vote',    icon:'star',     label:'Vote'    },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, cls:'btn-discord', icon:'discord',  label:'Discord' },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,cls:'btn-wa',      icon:'whatsapp', label:'Whatsapp' },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  cls:'btn-tiktok',  icon:'tiktok',   label:'TikTok'  },
    (s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL) && { href: s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL, cls:'btn-ig',      icon:'youtube',  label:'YouTube' },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="description" content={s.server_description || `Server Minecraft Indonesia — ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <div className="orange-theme-wrapper" style={{ backgroundColor: '#FAFAFA', color: '#18181B', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
        
        {/* ================= LIGHT ORANGE AMBIENT GLOW (SUPER LIGHTWEIGHT) ================= */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-15%', left: '5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,107,0,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* ================= HERO SECTION ================= */}
        <header style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifycontent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 24px 60px', position: 'relative', zIndex: 1 }}>
          
          {/* Logo dengan Bayangan Orange Lembut */}
          <div style={{ margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifycontent: 'center', filter: 'drop-shadow(0 16px 32px rgba(255,107,0,0.12))' }}>
            {s.logo_url
              ? <img src={s.logo_url} alt={serverName} style={{ maxWidth: 140, maxHeight: 140, display: 'block', objectFit: 'contain' }} />
              : <LogoImage alt={serverName} style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }} />
            }
          </div>

          {/* Tagline Pill (Kombinasi border tipis orange) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: '99px', backgroundColor: '#FFFFFF', border: '1px solid #E4E4E7', fontSize: 11, fontWeight: 700, color: '#3F3F46', letterSpacing: '0.5px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <span style={{ color: '#FF6B00' }}>SERVER ECONOMY</span>
            <span style={{ color: '#E4E4E7' }}>|</span>
            <span>JAVA &amp; BEDROCK</span>
          </div>

          {/* Title Utama */}
          <h1 className="font-space" style={{ fontSize: 'clamp(32px, 5.5vw, 54px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, maxWidth: 850, color: '#18181B' }}>
            {s.hero_title || <>Mulai Petualangan Seru di <span style={{ background: 'linear-gradient(135deg, #FF6B00, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{serverName}</span></>}
          </h1>

          {/* Deskripsi */}
          <p style={{ color: '#52525B', fontSize: 15.5, maxWidth: 560, lineHeight: 1.6, marginBottom: 36 }}>
            {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid, event seru, dan dunia tanpa batas.'}
          </p>

          {/* Status Player Online */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '99px', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', fontSize: 13, fontWeight: 600, color: '#9A3412', marginBottom: 36 }}>
            <div style={{ width: 8, height: 8, backgroundColor: '#FF6B00', borderRadius: '50%', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FF6B00', borderRadius: '50%', transform: 'scale(1.8)', opacity: 0.4, animation: 'ping-orange 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            </div>
            <span><strong style={{ color: '#FF6B00', fontWeight: 800 }}>{playerCount}</strong> Players Online</span>
          </div>

          {/* Triple IP Grid */}
          <div className="ip-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 800, marginBottom: 36 }}>
            {[
              { label: 'Java Edition IP', addr: serverIp, icon: 'computer', copy: serverIp, copyLabel: 'IP Java' },
              { label: 'Bedrock Edition IP', addr: serverIp, icon: 'mobile', copy: serverIp, copyLabel: 'IP Bedrock' },
              { label: 'Bedrock Port', addr: '19015', icon: 'network-wired', copy: '19015', copyLabel: 'Port Bedrock' },
            ].map((item, i) => (
              <div key={i} className="orange-ip-card" onClick={() => copyIP(item.copy, item.copyLabel)}>
                <span className="orange-copy-indicator">{copied === item.copyLabel ? '✓ Disalin' : 'Salin'}</span>
                <div className="orange-icon-wrapper">
                  <Icon name={item.icon} size={18} />
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <span className="orange-card-label">{item.label}</span>
                  <span className="orange-card-addr">{item.addr}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Social Media Row */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {socials.map((x, i) => (
                <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className={`orange-social-btn ${x.cls}`}>
                  <Icon name={x.icon} size={15} />
                  <span>{x.label}</span>
                </a>
              ))}
            </div>
          )}
        </header>

        {/* ================= STATS BAR ================= */}
        <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E4E7', borderBottom: '1px solid #E4E4E7', padding: '28px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 20, maxWidth: 960, margin: '0 auto' }} className="stats-grid">
            {[
              { val: '24/7', sub: 'Server Online' },
              { val: 'JAVA', sub: '+ Bedrock' },
              { val: 'FREE', sub: 'Untuk Semua' },
              { val: 'ID', sub: 'Community' },
            ].map((st, i) => (
              <div key={i}>
                <h3 className="font-space" style={{ fontSize: 26, color: '#FF6B00', fontWeight: 800 }}>{st.val}</h3>
                <p style={{ fontSize: 11, color: '#71717A', marginTop: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{st.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= FEATURES SECTION ================= */}
        <section style={{ padding: '80px 24px 60px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ color: '#FF6B00', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', marginBottom: 6 }}>FITUR UTAMA</span>
            <h2 className="font-space" style={{ fontSize: 30, fontWeight: 800, color: '#18181B' }}>Keunggulan Bermain di <span style={{ color: '#FF6B00' }}>Fancy</span></h2>
          </div>
          
          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 860, margin: '0 auto' }}>
            {[
              { icon: 'shield-halved', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.' },
              { icon: 'users', title: 'Komunitas Solid', desc: 'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.' },
              { icon: 'bolt', title: 'Low Latency', desc: 'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.' },
              { icon: 'trophy', title: 'Event & Reward', desc: 'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.' },
            ].map((f, i) => (
              <div key={i} className="orange-feature-card">
                <div className="feature-icon-box">
                  <Icon name={f.icon} size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#18181B', marginBottom: 4 }}>{f.title}</h4>
                  <p style={{ fontSize: 13, color: '#52525B', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= RECRUITMENT SECTION ================= */}
        <section style={{ padding: '20px 24px 100px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 580, margin: '0 auto' }}>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 20, padding: '36px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
              <span style={{ color: '#FF6B00', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>KONTRIBUSI &amp; REWARD</span>
              <h3 className="font-space" style={{ fontSize: 22, fontWeight: 800, color: '#18181B', marginBottom: 12 }}>Rank Famous Creator</h3>
              <p style={{ fontSize: 13.5, color: '#52525B', marginBottom: 24, lineHeight: 1.6 }}>
                Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0' }}>
                {['Tidak memiliki masalah dengan server lain', 'Membuat konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun'].map((r, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#27272A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
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
          </div>
        </section>

        <FancyFooter serverName={serverName} />

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      {/* ================= SCOPE STYLES ================= */}
      <style jsx>{`
        /* IP Cards */
        .orange-ip-card {
          background: #FFFFFF;
          border: 1px solid #E4E4E7;
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          will-change: transform, box-shadow;
        }
        .orange-ip-card:hover {
          border-color: #D4D4D8;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.04);
        }
        .orange-copy-indicator {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 9px;
          color: #71717A;
          background: #F4F4F5;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .orange-icon-wrapper {
          width: 36px;
          height: 36px;
          background: #FFF7ED;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FF6B00;
          flex-shrink: 0;
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
          font-size: 13.5px;
          font-weight: 700;
          color: #18181B;
          display: block;
          margin-top: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Feature Cards */
        .orange-feature-card {
          background: #FFFFFF;
          border: 1px solid #E4E4E7;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .feature-icon-box {
          width: 40px;
          height: 40px;
          background: #FFF7ED;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FF6B00;
          flex-shrink: 0;
        }

        /* Social Media Buttons */
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
          transition: background 0.1s, border-color 0.1s;
        }
        .orange-social-btn:hover {
          background: #F4F4F5;
          border-color: #D4D4D8;
        }

        /* Apply Button */
        .orange-apply-btn {
          background: #FF6B00;
          color: #FFFFFF;
          padding: 12px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
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

        @keyframes ping-orange {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        /* Responsive */
        @media(max-width: 768px) {
          .ip-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 20px 8px !important; }
        }
      `}</style>
    </>
  );
}
