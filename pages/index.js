import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import FancyNav from '../components/FancyNav';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import toast from 'react-hot-toast';
import Icon from '../components/Icon';
import FancyFooter from '../components/FancyFooter';

// Landing page = rute paling sering diakses; modal login HANYA perlu
// dimuat setelah user benar-benar klik tombol login.
const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });

const FEATURES = [
  { id:'anticheat', icon:'shield-halved', color:'#e67e22', title:'Anti-Cheat Ketat',  desc:'Sistem perlindungan berlapis yang menjamin kenyamanan bermain tanpa gangguan cheater.' },
  { id:'community',  icon:'users',         color:'#3498db', title:'Komunitas Solid',   desc:'Bergabunglah dengan ribuan pemain aktif di Discord dan game room yang ramah dan interaktif.' },
  { id:'latency',     icon:'bolt',          color:'#2ecc71', title:'Low Latency',       desc:'Infrastruktur server terbaik khusus dioptimalkan untuk performa ping super rendah.' },
  { id:'reward',      icon:'trophy',        color:'#9b59b6', title:'Event & Reward',    desc:'Event mingguan, daily reward, dan hadiah menarik menanti pemain aktif setiap harinya.' },
];

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch { return { props: { settings: {} } }; }
}

export default function HomePage({ settings }) {
  const s          = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp   = s.server_ip   || 'play.fancynet.my.id';
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
    (s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL)    && { href: s.vote_url    || process.env.NEXT_PUBLIC_VOTE_URL,    cls:'btn-vote',    icon:'star',     label:'Vote'    },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, cls:'btn-discord', icon:'discord',  label:'Discord', brand:true },
    (s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL)&& { href: s.whatsapp_url|| process.env.NEXT_PUBLIC_WHATSAPP_URL,cls:'btn-wa',      icon:'whatsapp', label:'Whatsapp',brand:true },
    (s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL)  && { href: s.tiktok_url  || process.env.NEXT_PUBLIC_TIKTOK_URL,  cls:'btn-tiktok',  icon:'tiktok',   label:'TikTok',  brand:true },
    (s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL) && { href: s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL, cls:'btn-ig',      icon:'youtube',  label:'YouTube', brand:true },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);

  const ipCards = [
    {label:'Java Edition IP',    addr:serverIp, icon:'computer',      copy:serverIp, copyLabel:'IP Java'},
    {label:'Bedrock Edition IP', addr:serverIp, icon:'mobile',        copy:serverIp, copyLabel:'IP Bedrock'},
    {label:'Bedrock Port',       addr:'19026',  icon:'network-wired', copy:'19026',  copyLabel:'Port Bedrock'},
  ];

  const statsBar = [
    {val:'24/7', sub:'Server Online'},
    {val:'JAVA', sub:'+ Bedrock'},
    {val:'FREE', sub:'Untuk Semua'},
    {val:'ID',   sub:'Community'},
  ];

  return (
    <>
      <Head>
        <title>{`${serverName} | Server Minecraft Indonesia`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="description" content={s.server_description || `${serverName} — Server Minecraft Survival Economy. Java & Bedrock. Bergabung sekarang di ${serverIp}`}/>

        {/* OpenGraph — dipakai Discord, WhatsApp, Telegram, dsb untuk preview embed */}
        <meta property="og:type"        content="website"/>
        <meta property="og:site_name"   content={serverName}/>
        <meta property="og:title"       content={`${serverName} | Server Minecraft Indonesia`}/>
        <meta property="og:description" content={s.server_description || `Server Minecraft Survival Economy. Java & Bedrock. Bergabung sekarang di ${serverIp}`}/>
        <meta property="og:url"         content={process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id'}/>
        {s.logo_url && <meta property="og:image" content={s.logo_url}/>}

        {/* Twitter Card — juga dipakai Discord untuk thumbnail */}
        <meta name="twitter:card"        content="summary"/>
        <meta name="twitter:title"       content={`${serverName} | Server Minecraft Indonesia`}/>
        <meta name="twitter:description" content={s.server_description || `Server Minecraft Survival Economy. Java & Bedrock. Bergabung sekarang di ${serverIp}`}/>
        {s.logo_url && <meta name="twitter:image" content={s.logo_url}/>}

        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      {/* HERO */}
      <header className="hero-header">

        {/* Floating orbs ambient */}
        <div className="hero-orbs">
          <div className="hero-orb hero-orb-1"/>
          <div className="hero-orb hero-orb-2"/>
          <div className="hero-orb hero-orb-3"/>
        </div>

        {/* Logo */}
        <div className="anim-hero anim-d1 hero-logo-wrap">
          {s.logo_url
            ? <img src={s.logo_url} alt={serverName} className="hero-logo-img"/>
            : <LogoImage alt={serverName} className="hero-logo-fallback"/>
          }
        </div>

        <span className="tagline-pill anim-hero-up anim-d2 hero-tagline">SERVER ECONOMY | JAVA &amp; BEDROCK</span>

        <h1 className="font-space anim-hero anim-d3 hero-title">
          {s.hero_title || <>Selamat <span className="hero-title-accent">Datang</span></>}
        </h1>

        <p className="anim-hero-up anim-d4 hero-desc">
          {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid, event seru, dan dunia tanpa batas.'}
        </p>

        {/* Triple IP Grid */}
        <div className="anim-hero-up anim-d5 hero-ip-grid">
          {ipCards.map((item,i) => (
            <div key={i} className="ip-card" onClick={()=>copyIP(item.copy, item.copyLabel)}>
              <span className="ip-card-copied-badge">
                {copied===item.copyLabel ? '✓ Disalin' : 'Salin'}
              </span>
              <div className="ip-card-icon">
                <Icon name={item.icon} size={18}/>
              </div>
              <div className="ip-card-text-wrap">
                <span className="ip-card-label">{item.label}</span>
                <span className="ip-card-value">{item.addr}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Status pill */}
        <div className="status-pill anim-hero-up anim-d5 hero-status-pill">
          <Icon name="circle" size={8} className="anim-pulse-dot"/>
          <span id="player-count">{playerCount}</span> Players Online
        </div>

        {/* Social buttons */}
        {socials.length > 0 && (
          <div className="anim-hero-up anim-d6 hero-social-row">
            {socials.map((x,i) => (
              <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className={`social-btn ${x.cls}`}>
                <Icon name={x.icon} size={16}/> {x.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* STATS BAR */}
      <section className="stats-bar" data-anim="fade-in">
        <div className="hero-stats-grid">
          {statsBar.map((st,i) => (
            <div key={i} data-anim="scale-pop" data-delay={String(i+1)}>
              <h3 className="font-space hero-stat-value">{st.val}</h3>
              <p className="hero-stat-label">{st.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — 2×2 Desktop Grid */}
      <section className="hero-features-section">
        <div className="hero-features-header" data-anim="fade-up">
          <span className="fn-recruit-eyebrow">KENAPA FANCY NETWORK</span>
          <h2 className="font-space fn-recruit-title">Server yang <span className="fn-logo-brand">Beda</span> dari yang Lain</h2>
        </div>
        {/* 2×2 symmetric desktop grid */}
        <div className="hero-features-grid">
          {FEATURES.map((f,i) => (
            <div key={f.id} className="fn-card hero-feature-card" data-anim="flip-in" data-delay={String(i+1)}>
              <div className="hero-feature-icon" style={{'--c': f.color}}>
                <Icon name={f.icon} size={20}/>
              </div>
              <div>
                <h4 className="hero-feature-title">{f.title}</h4>
                <p className="hero-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RECRUITMENT */}
      <section className="fn-recruit-section">
        <div className="fn-recruit-header" data-anim="fade-up">
          <span className="fn-recruit-eyebrow">KONTRIBUSI &amp; REWARD</span>
          <h2 className="font-space fn-recruit-title">Buka Potensimu di <span className="fn-logo-brand">{serverName}</span></h2>
        </div>
        <div className="fn-recruit-wrap" data-anim="scale-pop" data-delay="2">
          <div className="fn-apply-card">
            <div className="fn-apply-card-glow"/>
            <h3 className="font-space fn-apply-title">Rank Famous</h3>
            <p className="fn-apply-desc">
              Kreator Konten YouTube atau TikTok? Dapatkan hak istimewa status media, kustomisasi tag name, serta exposure di platform kami.
            </p>
            <ul className="fn-apply-list">
              {['Tidak memiliki masalah dengan server lain','Membuat konten Fancy Network rutin','Viewers aktif dan organik','Konten positif & membangun'].map((r,i) => (
                <li key={i}>
                  <Icon name="circle-check" size={13} color="#2ecc71"/> {r}
                </li>
              ))}
            </ul>
            <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="fn-apply-btn">
              Apply Requirement <Icon name="arrow-right" size={14} className="fn-icon-ml"/>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <FancyFooter serverName={serverName} discordUrl={s.discord_url} />

      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={handleLoginSuccess}/>}
    </>
  );
}
