import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import FancyNav from '../components/FancyNav';
import FancyFooter from '../components/FancyFooter';
import LogoImage, { useTransparentLogo } from '../components/LogoImage';
import Icon from '../components/Icon';

const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });

const FEATURES = [
  { id:'anticheat', icon:'shield-halved', tone:'orange', title:'Proteksi Anti-Cheat', desc:'Proteksi berlapis dan moderasi aktif menjaga permainan tetap adil tanpa mengganggu pemain normal.' },
  { id:'community', icon:'users', tone:'blue', title:'Komunitas Aktif', desc:'Temukan teman baru, party, guild, dan bantuan cepat dari komunitas Indonesia yang ramah.' },
  { id:'latency', icon:'bolt', tone:'green', title:'Performa Stabil', desc:'Konfigurasi server dan jaringan dioptimalkan untuk TPS stabil serta latensi yang nyaman.' },
  { id:'reward', icon:'trophy', tone:'purple', title:'Event & Reward', desc:'Daily reward, event komunitas, dan hadiah rutin membuat progres bermain selalu terasa menarik.' },
];

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard tidak tersedia');
}

export async function getServerSideProps() {
  try {
    const { SettingsAsync } = await import('../lib/redis.js');
    return { props: { settings: await SettingsAsync.get() } };
  } catch {
    return { props: { settings: {} } };
  }
}

export default function HomePage({ settings }) {
  const s = useMemo(() => settings || {}, [settings]);
  const serverName = s.server_name || 'Fancy Network';
  const javaIp = s.server_ip || 'play.fancynet.my.id';
  const bedrockIp = s.bedrock_ip || javaIp;
  const bedrockPort = String(s.bedrock_port || '19026');
  const heroTitle = s.hero_title || `Mainkan petualangan terbaikmu di ${serverName}`;
  const heroSubtitle = s.hero_subtitle || s.server_description || 'Server Minecraft Indonesia dengan Economy, RPG, komunitas aktif, dan progres yang selalu menarik.';
  const { src: logoSrc } = useTransparentLogo();

  const [player, setPlayer] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [copied, setCopied] = useState('');
  const [status, setStatus] = useState({ loading:true, online:false, players:0, maxPlayers:0, version:'' });
  const copiedTimerRef = useRef(null);

  const loadStatus = useCallback(async (signal) => {
    try {
      const response = await fetch('/api/server/status', {
        signal,
        credentials:'same-origin',
        headers:{ Accept:'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatus({
        loading:false,
        online:data.online === true,
        players:Number(data.players) || 0,
        maxPlayers:Number(data.maxPlayers) || 0,
        version:typeof data.version === 'string' ? data.version : '',
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus(current => ({ ...current, loading:false, online:false }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    try {
      const cached = localStorage.getItem('mc_player');
      if (cached) setPlayer(JSON.parse(cached));
    } catch {
      localStorage.removeItem('mc_player');
    }

    fetch('/api/auth/me', {
      credentials:'include',
      signal:controller.signal,
      headers:(() => { try { const token = localStorage.getItem('mc_token'); return token ? { Authorization:`Bearer ${token}` } : {}; } catch { return {}; } })(),
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        if (data?.success && data.player) {
          setPlayer(data.player);
          localStorage.setItem('mc_player', JSON.stringify(data.player));
        } else {
          setPlayer(null);
          localStorage.removeItem('mc_player');
          localStorage.removeItem('mc_token');
        }
      })
      .catch(error => {
        if (error?.name !== 'AbortError') {
          // Tetap gunakan cache ketika koneksi sementara bermasalah.
        }
      });

    loadStatus(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadStatus();
    }, 45_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadStatus();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, [loadStatus]);

  const copyAddress = useCallback(async (text, label) => {
    try {
      await writeClipboard(text);
      setCopied(label);
      toast.success(`${label} berhasil disalin`);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(''), 2200);
    } catch {
      toast.error(`Gagal menyalin ${label}. Salin secara manual: ${text}`);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
      if (!response.ok) throw new Error('Logout gagal');
      toast.success('Berhasil keluar');
    } catch {
      toast.error('Sesi lokal dibersihkan, tetapi server tidak dapat dihubungi');
    } finally {
      setPlayer(null);
      localStorage.removeItem('mc_player');
      localStorage.removeItem('mc_token');
    }
  }, []);

  const handleLoginSuccess = useCallback((nextPlayer) => {
    setPlayer(nextPlayer);
    try { localStorage.setItem('mc_player', JSON.stringify(nextPlayer)); } catch {}
    setShowLogin(false);
  }, []);

  const socials = useMemo(() => [
    { href:safeExternalUrl(s.vote_url || process.env.NEXT_PUBLIC_VOTE_URL), icon:'star', label:'Vote', cls:'is-vote' },
    { href:safeExternalUrl(s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL), icon:'discord', label:'Discord', cls:'is-discord' },
    { href:safeExternalUrl(s.whatsapp_url || process.env.NEXT_PUBLIC_WHATSAPP_URL), icon:'whatsapp', label:'WhatsApp', cls:'is-whatsapp' },
    { href:safeExternalUrl(s.tiktok_url || process.env.NEXT_PUBLIC_TIKTOK_URL), icon:'tiktok', label:'TikTok', cls:'is-tiktok' },
    { href:safeExternalUrl(s.youtube_url || process.env.NEXT_PUBLIC_YOUTUBE_URL), icon:'youtube', label:'YouTube', cls:'is-youtube' },
  ].filter(item => item.href), [s]);

  const famousApplyUrl = safeExternalUrl(
    process.env.NEXT_PUBLIC_FAMOUS_APPLY_URL || s.famous_apply_url || s.discord_url || process.env.NEXT_PUBLIC_DISCORD_URL
  );

  const playerCount = status.online ? status.players : Number(s.players_online) || 0;
  const maxPlayers = status.maxPlayers || 0;
  const population = maxPlayers > 0 ? Math.min(100, Math.round((playerCount / maxPlayers) * 100)) : 0;
  const statusText = status.loading ? 'Memeriksa server' : status.online ? 'Server online' : 'Server offline';

  const endpointCards = [
    { key:'java', label:'Java Edition IP', value:javaIp, icon:'computer', copy:javaIp },
    { key:'bedrock-ip', label:'Bedrock Edition IP', value:bedrockIp, icon:'mobile', copy:bedrockIp },
    { key:'bedrock-port', label:'Bedrock Port', value:bedrockPort, icon:'network-wired', copy:bedrockPort },
  ];

  return (
    <>
      <Head>
        <title>{`${serverName} | Minecraft Server Indonesia`}</title>
        <meta name="description" content={s.server_description || `${serverName} — Minecraft Server Indonesia Java & Bedrock. Bergabung di ${javaIp}.`}/>
        <meta property="og:type" content="website"/>
        <meta property="og:site_name" content={serverName}/>
        <meta property="og:title" content={`${serverName} | Minecraft Server Indonesia`}/>
        <meta property="og:description" content={s.server_description || `Main bersama komunitas ${serverName}. Java & Bedrock tersedia.`}/>
        <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL || 'https://fancynet.my.id'}/>
        {s.logo_url && <meta property="og:image" content={s.logo_url}/>} 
        <meta name="twitter:card" content={s.logo_url ? 'summary_large_image' : 'summary'}/>
        <meta name="twitter:title" content={`${serverName} | Minecraft Server Indonesia`}/>
        <meta name="twitter:description" content={s.server_description || `Main bersama komunitas ${serverName}.`}/>
        {s.logo_url && <meta name="twitter:image" content={s.logo_url}/>} 
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <div className="public-shell orange-public-theme">
        <FancyNav player={player} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        <main className="landing-page landing-orange-page">
        <header className="landing-hero">
          <div className="landing-grid-glow" aria-hidden="true"/>
          <div className="landing-orb landing-orb-a" aria-hidden="true"/>
          <div className="landing-orb landing-orb-b" aria-hidden="true"/>

          <div className="landing-hero-grid">
            <section className="landing-hero-copy">
              <div className="landing-eyebrow anim-hero-up anim-d1">
                <span className={`landing-status-dot ${status.online ? 'is-online' : 'is-offline'}`}/>
                {statusText}
                {status.version && <span className="landing-version">{status.version}</span>}
              </div>

              <h1 className="font-space landing-title anim-hero anim-d2">{heroTitle}</h1>
              <p className="landing-description anim-hero-up anim-d3">{heroSubtitle}</p>

              <div className="landing-actions anim-hero-up anim-d4">
                <button type="button" className="landing-primary-action" onClick={() => copyAddress(javaIp, 'IP Java')}>
                  <Icon name={copied === 'IP Java' ? 'circle-check' : 'copy'} size={17}/>
                  <span>{copied === 'IP Java' ? 'IP berhasil disalin' : 'Salin IP & Main'}</span>
                </button>
                <Link href="/store" className="landing-secondary-action">
                  Lihat Store <Icon name="arrow-right" size={16}/>
                </Link>
              </div>

              <div className="landing-mini-stats anim-hero-up anim-d5">
                <div><strong>{playerCount}</strong><span>Pemain online</span></div>
                <div><strong>24/7</strong><span>Server aktif</span></div>
                <div><strong>Java</strong><span>&amp; Bedrock</span></div>
              </div>
            </section>

            <aside className="server-console anim-hero anim-d3" aria-label="Informasi koneksi server">
              <div className="server-console-top">
                <div className="server-console-brand">
                  <div className="server-console-logo">
                    {s.logo_url
                      ? <img src={s.logo_url} alt=""/>
                      : <LogoImage alt="" className="server-console-logo-fallback"/>}
                  </div>
                  <div>
                    <span>WELCOME TO</span>
                    <strong className="font-space">{serverName}</strong>
                  </div>
                </div>
                <span className={`server-health-badge ${status.online ? 'is-online' : 'is-offline'}`}>
                  {status.loading ? 'CHECKING' : status.online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              <div className="server-console-screen">
                <div className="server-population-head">
                  <div>
                    <span>LIVE POPULATION</span>
                    <strong>{playerCount}{maxPlayers ? ` / ${maxPlayers}` : ''}</strong>
                  </div>
                  <Icon name="users" size={20}/>
                </div>
                <div className="server-population-track" aria-label={`Kapasitas server ${population}%`}>
                  <span style={{ width:`${population}%` }}/>
                </div>
              </div>

              <div className="server-endpoints">
                {endpointCards.map(item => (
                  <button key={item.key} type="button" className="server-endpoint" onClick={() => copyAddress(item.copy, item.label)}>
                    <span className="server-endpoint-icon"><Icon name={item.icon} size={18}/></span>
                    <span className="server-endpoint-copy">
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </span>
                    <span className="server-endpoint-action">
                      <Icon name={copied === item.label ? 'circle-check' : 'copy'} size={16}/>
                    </span>
                  </button>
                ))}
              </div>

              <p className="server-console-hint">
                <Icon name="circle-info" size={14}/> Klik alamat untuk menyalin otomatis
              </p>
            </aside>
          </div>

          {socials.length > 0 && (
            <div className="landing-socials anim-hero-up anim-d6" aria-label="Media sosial">
              <span>Temukan kami</span>
              <div>
                {socials.map(item => (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={`landing-social-link ${item.cls}`} aria-label={item.label}>
                    <Icon name={item.icon} size={16}/><span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </header>

        <section className="landing-section landing-features">
          <div className="landing-section-heading" data-anim="fade-up">
            <span>ALASAN UNTUK BERGABUNG</span>
            <h2 className="font-space">Dibangun untuk pengalaman bermain yang lebih serius</h2>
            <p>Bukan sekadar tempat bermain. Setiap sistem dirancang agar progres, komunitas, dan kompetisi tetap seimbang.</p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feature, index) => (
              <article key={feature.id} className={`landing-feature-card tone-${feature.tone}`} data-anim="fade-up" data-delay={String(index + 1)}>
                <div className="landing-feature-number">0{index + 1}</div>
                <div className="landing-feature-icon"><Icon name={feature.icon} size={22}/></div>
                <h3 className="font-space">{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-famous-program" data-anim="fade-up">
          <div className="landing-famous-copy">
            <span className="landing-section-label">CREATOR PROGRAM</span>
            <h2 className="font-space">Rank Famous untuk kreator yang ikut membesarkan komunitas.</h2>
            <p>Program ini ditujukan untuk kreator YouTube dan TikTok yang konsisten membuat konten positif. Benefitnya bukan sekadar badge, tetapi identitas khusus, exposure, serta kesempatan kolaborasi bersama server.</p>
            <div className="landing-famous-benefits">
              <span><Icon name="star" size={15}/> Tag dan role kreator</span>
              <span><Icon name="users" size={15}/> Exposure komunitas</span>
              <span><Icon name="trophy" size={15}/> Kolaborasi event</span>
            </div>
            <div className="landing-creator-actions">
              {famousApplyUrl ? (
                <a href={famousApplyUrl} target="_blank" rel="noopener noreferrer" className="landing-primary-action">
                  Daftar Rank Famous <Icon name="arrow-right" size={16}/>
                </a>
              ) : (
                <Link href="/support" className="landing-primary-action">
                  Tanyakan ke Support <Icon name="arrow-right" size={16}/>
                </Link>
              )}
              <Link href="/support" className="landing-text-link">Lihat persyaratan</Link>
            </div>
          </div>

          <aside className="landing-famous-card" aria-label="Persyaratan Rank Famous">
            <div className="landing-famous-rank-head">
              <span><Icon name="star" size={22}/></span>
              <div><small>EXCLUSIVE CREATOR RANK</small><strong>FAMOUS</strong></div>
            </div>
            <ul>
              {[
                `Membuat konten ${serverName} secara rutin`,
                'Audiens aktif dan organik',
                'Konten positif serta mematuhi peraturan',
                'Tidak memiliki masalah aktif dengan komunitas lain',
              ].map(item => (
                <li key={item}><Icon name="circle-check" size={16}/><span>{item}</span></li>
              ))}
            </ul>
          </aside>
        </section>
        </main>

        <FancyFooter serverName={serverName} discordUrl={safeExternalUrl(s.discord_url)} settings={s} />
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess}/>} 
    </>
  );
}
