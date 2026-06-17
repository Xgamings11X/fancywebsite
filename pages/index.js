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
    setTimeout(() => setCopied(''), 2500);
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

  const ipItems = [
    { label: 'Java Edition IP', addr: serverIp, copy: serverIp, copyLabel: 'IP Java' },
    { label: 'Bedrock Edition IP', addr: serverIp, copy: serverIp, copyLabel: 'IP Bedrock' },
    { label: 'Bedrock Port', addr: '19015', copy: '19015', copyLabel: 'Port Bedrock' },
  ];

  const features = [
    { color: '#e67e22', marker: 'AC', title: 'Anti-Cheat Ketat', desc: 'Sistem perlindungan berlapis yang menjaga pengalaman bermain tetap nyaman.' },
    { color: '#3498db', marker: 'CM', title: 'Komunitas Solid', desc: 'Discord dan game room aktif untuk pemain baru maupun lama.' },
    { color: '#2ecc71', marker: 'LL', title: 'Low Latency', desc: 'Server dioptimalkan agar gameplay terasa responsif.' },
    { color: '#9b59b6', marker: 'EV', title: 'Event & Reward', desc: 'Event mingguan, daily reward, dan hadiah untuk pemain aktif.' },
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

      <main>
        <header className="home-hero">
          <div className="home-logo-wrap" aria-hidden={!logoUrl}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={serverName}
                width="160"
                height="160"
                className="home-logo"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="home-logo-fallback">FN</div>
            )}
          </div>

          <span className="tagline-pill">SERVER ECONOMY | JAVA &amp; BEDROCK</span>

          <h1 className="font-space home-title">
            {s.hero_title || <>Selamat <span>Datang</span></>}
          </h1>

          <p className="home-description">
            {s.server_description || 'Server Minecraft Indonesia dengan komunitas solid, event seru, dan dunia tanpa batas.'}
          </p>

          <div className="ip-grid home-ip-grid">
            {ipItems.map((item) => (
              <button key={item.copyLabel} type="button" className="ip-card home-ip-card" onClick={() => copyIP(item.copy, item.copyLabel)}>
                <span className="home-ip-action">{copied === item.copyLabel ? 'Disalin' : 'Salin'}</span>
                <span className="home-ip-icon">IP</span>
                <span className="home-ip-text">
                  <span>{item.label}</span>
                  <strong>{item.addr}</strong>
                </span>
              </button>
            ))}
          </div>

          <div className="status-pill home-status">
            <span className="home-status-dot" />
            <span id="player-count">{playerCount}</span> Players Online
          </div>

          {socials.length > 0 && (
            <div className="home-socials">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" className={`social-btn ${x.cls}`}>
                  {x.label}
                </a>
              ))}
            </div>
          )}
        </header>

        <section className="stats-bar" data-anim="fade-in">
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
          <div className="home-section-heading" data-anim="fade-up">
            <span>KENAPA FANCY NETWORK</span>
            <h2 className="font-space">Server yang <strong>Beda</strong> dari yang Lain</h2>
          </div>

          <div className="home-feature-grid">
            {features.map((f) => (
              <article key={f.title} className="fn-card home-feature-card" data-anim="fade-up">
                <div className="home-feature-icon" style={{ color: f.color, borderColor: `${f.color}55`, background: `${f.color}1f` }}>
                  {f.marker}
                </div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section home-recruitment">
          <div className="home-section-heading" data-anim="fade-up">
            <span>KONTRIBUSI &amp; REWARD</span>
            <h2 className="font-space">Buka Potensimu di <strong>{serverName}</strong></h2>
          </div>

          <article className="fn-card home-rank-card" data-anim="fade-up">
            <h3 className="font-space">Rank Famous</h3>
            <p>Kreator konten YouTube atau TikTok bisa mendapatkan status media, kustomisasi tag name, dan exposure komunitas.</p>
            <ul>
              {['Tidak memiliki masalah dengan server lain', 'Membuat konten Fancy Network rutin', 'Viewers aktif dan organik', 'Konten positif & membangun'].map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="btn-primary-fn home-apply-btn">
              Apply Requirement
            </a>
          </article>
        </section>
      </main>

      <footer className="fn-footer" data-anim="fade-up">
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
