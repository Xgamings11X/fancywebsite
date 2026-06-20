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

      <div className="theme-wrapper" style={{ backgroundColor: '#F8FAFC', color: '#0F172A', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
        
        {/* ================= BACKGROUND AMBIENT GLOW (LIGHT VERSION) ================= */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(100px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s} />

        {/* ================= HERO SECTION ================= */}
        <header style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 24px 60px', position: 'relative', zIndex: 1 }}>
          
          {/* Logo Container */}
          <div style={{ margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 20px 40px rgba(59,130,246,0.15))' }}>
            {s.logo_url
              ? <img src={s.logo_url} alt={serverName} style={{ maxWidth: 150, maxHeight: 150, display: 'block', objectFit: 'contain' }} />
              : <LogoImage alt={serverName} style={{ width: 130, height: 130, objectFit: 'contain', display: 'block' }} />
            }
          </div>

          {/* Badge Tagline */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: '99px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 700, color: '#334155', letterSpacing: '0.5px', marginBottom: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <span style={{ color: '#3B82F6' }}>SERVER ECONOMY</span>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span>JAVA &amp; BEDROCK</span>
          </div>

          {/* Title */}
          <h1 className="font-space" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, maxWidth: 800, color: '#0F172A' }}>
            {s.hero_title || <>Selamat Datang di <span style={{ background: 'linear-gradient(to right, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{serverName}</span></>}
          </h1>

          {/* Description */}
          <p style={{ color: '#475569', fontSize: 16, maxWidth: 580, lineHeight: 1.6, marginBottom: 36 }}>
            {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid, event seru, dan dunia tanpa batas.'}
          </p>

          {/* Player Online Status Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '99px', backgroundColor: '#EEF2F6', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 32 }}>
            <div style={{ width: 8, height: 8, backgroundColor: '#10B981', borderRadius: '50%', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundColor: '#10B981', borderRadius: '50%', transform: 'scale(1.8)', opacity: 0.3, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            </div>
            <span><strong style={{ color: '#10B981', fontWeight: 700 }}>{playerCount}</strong> Pemain Aktif</span>
          </div>

          {/* Triple IP Grid */}
          <div className="ip-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: '100%', maxWidth: 800, marginBottom: 36 }}>
            {[
              { label: 'Java Edition IP', addr: serverIp, icon: 'computer', copy: serverIp, copyLabel: 'IP Java' },
              { label: 'Bedrock Edition IP', addr: serverIp, icon: 'mobile', copy: serverIp, copyLabel: 'IP Bedrock' },
              { label: 'Bedrock Port', addr: '19015', icon: 'network-wired', copy: '19015', copyLabel: 'Port Bedrock' },
            ].map((item, i) => (
              <div key={i} className="ip-card-light" onClick={() => copyIP(item.copy, item.copyLabel)}>
                <span className="copy-indicator">{copied === item.copyLabel ? '✓ Disalin' : 'Salin'}</span>
                <div className="icon-wrapper-light">
                  <Icon name={item.icon} size={18} />
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <span className="card-label-light">{item.label}</span>
                  <span className="card-addr-light">{item.addr}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Social Media Row */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {socials.map((x, i) => (
                <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className={`social-btn-light ${x.cls}`}>
                  <Icon name={x.icon} size={16} />
                  <span>{x.label}</span>
                </a>
              ))}
            </div>
          )}
        </header>

        {/* ================= STATS BAR ================= */}
        <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', gap: 20, maxWidth: 1000, margin: '0 auto' }} className="stats-grid">
            {[
              { val: '24/7', sub: 'Server Online' },
              { val: 'JAVA', sub: '+ Bedrock' },
              { val: 'FREE', sub: 'Untuk Semua' },
              { val: 'ID', sub: 'Community' },
            ].map((st, i) => (
              <div key={i}>
                <h3 className="font-space" style={{ fontSize: 28, color: '#3B82F6', fontWeight: 800 }}>{st.val}</h3>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{st.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= FEATURES SECTION ================= */}
        <section style={{ padding: '90px 24px 60px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={{ color: '#3B82F6', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', marginBottom: 6 }}>FITUR UTAMA</span>
            <h2 className="font-space" style={{ fontSize: 32, fontWeight: 800, color: '#0F172A' }}>Keunggulan Bermain di <span style={{ color: '#3B82F6' }}>Fancy</span></h2>
          </div>
          
          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' }}>
            {[
              { icon: 'shield-halved', color: '#3B82F6', bg: '#EFF6FF', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.' },
              { icon: 'users', color: '#8B5CF6', bg: '#F5F3FF', title: 'Komunitas Solid', desc: 'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.' },
              { icon: 'bolt', color: '#10B981', bg: '#ECFDF5', title: 'Low Latency', desc: 'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.' },
              { icon: 'trophy', color: '#F59E0B', bg: '#FFFBEB', title: 'Event & Reward', desc: 'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.' },
            ].map((f, i) => (
              <div key={i} className="feature-card-light">
                <div style={{ width: 44, height: 44, backgroundColor: f.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                  <Icon name={f.icon} size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{f.title}</h4>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= RECRUITMENT SECTION ================= */}
        <section style={{ padding: '30px 24px 100px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 24, padding: '40px 32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.02)' }}>
              <span style={{ color: '#8B5CF6', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>KONTRIBUSI &amp; REWARD</span>
              <h3 className="font-space" style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Rank Famous Creator</h3>
              <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
                Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
                {['Tidak memiliki masalah dengan server lain', 'Membuat konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun'].map((r, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="circle-check" size={14} color="#10B981" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="apply-btn-light">
                <span>Apply Requirement</span>
                <Icon name="arrow-right" size={14} />
              </a>
            </div>
          </div>
        </section>

        <FancyFooter serverName={serverName} />

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      </div>

      {/* ================= STYLES (OPTIMIZED) ================= */}
      <style jsx>{`
        /* IP Cards (Light Modern) */
        .ip-card-light {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 14px 16px;
          cursor: pointer;
          display: flex;
          alignItems: center;
          gap: 12;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ip-card-light:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .copy-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          fontSize: 9px;
          color: #94A3B8;
          background: #F1F5F9;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .icon-wrapper-light {
          width: 38px;
          height: 38px;
          background: #EFF6FF;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3B82F6;
          flex-shrink: 0;
        }
        .card-label-light {
          font-size: 9px;
          text-transform: uppercase;
          color: #64748B;
          font-weight: 700;
          letter-spacing: 0.5px;
          display: block;
        }
        .card-addr-light {
          font-size: 14px;
          font-weight: 700;
          color: #1E293B;
          display: block;
          margin-top: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Feature Card */
        .feature-card-light {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        /* Social Buttons */
        .social-btn-light {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: #334155;
          transition: background 0.15s, color 0.15s;
        }
        .social-btn-light:hover {
          background: #F8FAFC;
          color: #0F172A;
        }

        /* Recruitment Apply Button */
        .apply-btn-light {
          background: #1E293B;
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
        .apply-btn-light:hover {
          background: #0F172A;
        }

        /* Keyframes untuk pulsing tanpa JS */
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }

        /* Responsive Layouts Grid */
        @media(max-width: 768px) {
          .ip-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 24px 10px !important; }
        }
      `}</style>
    </>
  );
}
