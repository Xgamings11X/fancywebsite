import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FancyNav from '../components/FancyNav';
import LoginModal from '../components/LoginModal';
import toast from 'react-hot-toast';

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    const settings = await SettingsAsync.get();
    return { props: { settings } };
  } catch {
    return { props: { settings: {} } };
  }
}

const isUsableImageUrl = (url) => typeof url === 'string' && url && !url.startsWith('data:');

export default function HomePage({ settings }) {
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const serverIp = s.server_ip || 'fancynet.my.id';
  const logoUrl = isUsableImageUrl(s.logo_url) ? s.logo_url : '';

  const [player, setPlayer] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied, setCopied] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    try {
      const rawPlayer = localStorage.getItem('mc_player');
      if (rawPlayer) setPlayer(JSON.parse(rawPlayer));
    } catch {}

    fetch('/api/server/status').then(r => r.json()).then(setStatus).catch(() => {});
    document.body.classList.add('page-loaded');
    return () => document.body.classList.remove('page-loaded');
  }, []);

  const copyIP = (text, label) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(label);
    toast.success(`${label} "${text}" berhasil disalin!`);
    setTimeout(() => setCopied(''), 2200);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
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
    (s.vote_url || process.env.NEXT_PUBLIC_VOTE_URL) && { href: s.vote_url || process.env.NEXT_PUBLIC_VOTE_URL, cls: 'btn-vote', label: 'Vote' },
    (s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL) && { href: s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL, cls: 'btn-discord', label: 'Discord' },
    (s.whatsapp_url || process.env.NEXT_PUBLIC_WHATSAPP_URL) && { href: s.whatsapp_url || process.env.NEXT_PUBLIC_WHATSAPP_URL, cls: 'btn-wa', label: 'Whatsapp' },
    (s.tiktok_url || process.env.NEXT_PUBLIC_TIKTOK_URL) && { href: s.tiktok_url || process.env.NEXT_PUBLIC_TIKTOK_URL, cls: 'btn-tiktok', label: 'TikTok' },
    (s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL) && { href: s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL, cls: 'btn-ig', label: 'YouTube' },
  ].filter(Boolean);

  const famousApplyUrl = s.discord_url || process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || process.env.NEXT_PUBLIC_DISCORD_URL || '#';
  const playerCount = status?.online ? status.players : (s.players_online || 0);
  const onlineState = status?.online ? 'Online' : 'Checking';

  const ipItems = [
    { label: 'Java Edition', addr: serverIp, copy: serverIp, copyLabel: 'IP Java' },
    { label: 'Bedrock Edition', addr: serverIp, copy: serverIp, copyLabel: 'IP Bedrock' },
    { label: 'Bedrock Port', addr: '19015', copy: '19015', copyLabel: 'Port Bedrock' },
  ];

  const features = [
    { marker: '01', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis untuk menjaga server tetap adil dan nyaman.' },
    { marker: '02', title: 'Komunitas Aktif', desc: 'Tempat bermain yang ramah untuk pemain baru, veteran, dan kreator konten.' },
    { marker: '03', title: 'Low Latency', desc: 'Pengalaman bermain dibuat responsif dengan konfigurasi server yang ringan.' },
    { marker: '04', title: 'Event & Reward', desc: 'Event komunitas, daily reward, dan benefit rank untuk pemain aktif.' },
  ];

  return (
    <>
      <Head>
        <title>{serverName} | Minecraft Server Indonesia</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={s.server_description || `Server Minecraft Indonesia - ${serverName}`} />
        <link rel="icon" type="image/png" href={logoUrl || '/favicon.png'} />
      </Head>

      <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={{ ...s, logo_url: logoUrl }} />

      <main className="home-shell">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="tagline-pill">JAVA & BEDROCK SERVER</span>
            <h1 className="font-space home-title">
              {s.hero_title || <>Selamat datang di <span>{serverName}</span></>}
            </h1>
            <p className="home-description">
              {s.server_description || 'Server Minecraft Indonesia dengan ekonomi, komunitas aktif, event rutin, dan pengalaman bermain yang dibuat nyaman untuk semua player.'}
            </p>

            <div className="home-actions">
              <Link href="/store" className="btn-primary-fn home-main-cta">Buka Store</Link>
              <button type="button" className="btn-ghost-fn" onClick={() => copyIP(serverIp, 'IP Java')}>Copy IP</button>
            </div>

            {socials.length > 0 && (
              <div className="home-socials" aria-label="Social links">
                {socials.map((x) => (
                  <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" className={`social-btn ${x.cls}`}>
                    {x.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <aside className="home-server-panel" aria-label="Server summary">
            <div className="home-logo-wrap">
              {logoUrl ? (
                <img src={logoUrl} alt={serverName} width="144" height="144" className="home-logo" decoding="async" fetchPriority="high" />
              ) : (
                <div className="home-logo-fallback">FN</div>
              )}
            </div>

            <div className="home-panel-title">
              <span>{serverName}</span>
              <strong>{onlineState}</strong>
            </div>

            <div className="home-status-row">
              <div className="status-pill"><span className="home-status-dot" /> {playerCount} Players Online</div>
              <Link href="/leaderboard" className="home-small-link">Leaderboard</Link>
            </div>

            <div className="home-ip-grid">
              {ipItems.map((item) => (
                <button key={item.copyLabel} type="button" className="ip-card home-ip-card" onClick={() => copyIP(item.copy, item.copyLabel)}>
                  <span className="home-ip-copy">{copied === item.copyLabel ? 'Disalin' : 'Salin'}</span>
                  <span className="home-ip-label">{item.label}</span>
                  <strong>{item.addr}</strong>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <section className="stats-bar home-stats-band">
          <div className="home-stats-grid">
            {[
              { val: '24/7', sub: 'Server Online' },
              { val: 'JAVA', sub: '+ Bedrock' },
              { val: 'FREE', sub: 'Untuk Semua' },
              { val: 'ID', sub: 'Community' },
            ].map((st) => (
              <div key={st.sub}>
                <h2 className="font-space">{st.val}</h2>
                <p>{st.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-heading">
            <span>KENAPA FANCY NETWORK</span>
            <h2 className="font-space">Server yang <strong>rapi, aktif, dan siap dimainkan</strong></h2>
          </div>

          <div className="home-feature-grid">
            {features.map((f) => (
              <article key={f.title} className="fn-card home-feature-card">
                <span className="home-feature-index">{f.marker}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section home-recruitment">
          <div className="home-recruitment-card fn-card">
            <div>
              <span className="home-eyebrow">KONTRIBUSI & REWARD</span>
              <h2 className="font-space">Rank Famous untuk kreator aktif</h2>
              <p>Kreator konten YouTube atau TikTok bisa mendapatkan status media, kustomisasi tag name, dan exposure komunitas.</p>
            </div>
            <ul>
              {['Konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun', 'Tidak bermasalah dengan server lain'].map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary-fn home-apply-btn">Apply Requirement</a>
          </div>
        </section>
      </main>

      <footer className="fn-footer">
        <div className="font-space home-footer-brand">{serverName}</div>
        <ul className="home-footer-links">
          {['/', '/store', '/leaderboard', '/support'].map((href, j) => ({ href, label: ['Home', 'Store', 'Leaderboard', 'Support'][j] })).map((l) => (
            <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
        <div className="fn-footer-bottom">© 2026 {serverName}. Tidak terafiliasi dengan Mojang Studios.</div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
    </>
  );
}
