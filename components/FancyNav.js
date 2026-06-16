// components/FancyNav.js — Capsule navbar shared semua halaman
// ✅ FIXED: Desktop menu sekarang TRUE CENTER menggunakan absolute positioning
//           sehingga menu selalu presisi di tengah navbar, tidak terpengaruh
//           lebar logo atau tombol kanan.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import LogoImage, { useTransparentLogo } from './LogoImage';

export default function FancyNav({ player, onLoginClick, onLogout, settings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router  = useRouter();
  const s       = settings || {};
  const logoUrl = s.logo_url || null;
  const logoTxt = s.logo_text || 'Fancy Network';

  const links = [
    { href:'/',            label:'Home'        },
    { href:'/store',       label:'Store'       },
    { href:'/leaderboard', label:'Leaderboard' },
    { href:'/support',     label:'Support'     },
  ];

  return (
    // ─── NAVBAR CONTAINER ────────────────────────────────────────────────────
    // position: relative diperlukan agar absolute child (menu center) bekerja
    <nav className="fn-nav" style={{ position: 'fixed' }}>

      {/* ── Logo (kiri) ── */}
      <Link
        href="/"
        className="flex items-center gap-2 flex-shrink-0"
        style={{ textDecoration: 'none', position: 'relative', zIndex: 2 }}
      >
        {logoUrl
          ? <img
              src={logoUrl}
              alt={logoTxt}
              // ✅ PERFORMA: tambahkan loading="lazy" & decoding="async"
              loading="eager"          /* logo above-fold, eager OK */
              decoding="async"
              width={40}
              height={40}
              style={{
                height: 40, width: 'auto',
                background: 'transparent', objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(255,107,0,0.5))',
                animation: 'logoFloat 3s ease-in-out infinite',
              }}
            />
          : <span
              className="font-space font-bold text-white text-base"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogoImage
                src={logoUrl || undefined}
                alt={logoTxt}
                style={{
                  height: 38, width: 38, objectFit: 'contain',
                  filter: 'drop-shadow(0 0 10px rgba(255,107,0,0.5))',
                  animation: 'logoFloat 3s ease-in-out infinite',
                }}
              />
              <span>
                <span style={{ color: 'var(--primary)' }}>FANCY</span> NETWORK
              </span>
            </span>
        }
      </Link>

      {/* ── Desktop Menu — TRUE CENTER ────────────────────────────────────────
           Teknik: absolute + left:50% + translateX(-50%)
           Efeknya: menu selalu tepat di tengah navbar, TIDAK dipengaruhi
           lebar konten kiri (logo) maupun kanan (tombol login/hamburger).
           justify-content: center + align-items: center memastikan teks
           juga center secara vertikal di dalam list items.
      ─────────────────────────────────────────────────────────────────────── */}
      <ul
        className="hidden md:flex list-none gap-5"
        style={{
          /* ✅ TRUE CENTER — kunci perbaikan */
          position:       'absolute',
          left:           '50%',
          top:            '50%',
          transform:      'translate(-50%, -50%)',

          /* Pastikan menu di atas elemen lain */
          zIndex:         1,

          /* Alignment item di dalam list */
          alignItems:     'center',
          justifyContent: 'center',

          /* Reset margin/padding bawaan ul */
          margin:         0,
          padding:        0,
        }}
      >
        {links.map(l => {
          const isActive = router.pathname === l.href;
          return (
            <li
              key={l.href}
              style={{
                /* Setiap li juga flex-center agar link presisi vertikal */
                display:     'flex',
                alignItems:  'center',
                height:      '100%',
              }}
            >
              <Link
                href={l.href}
                style={{
                  color:          isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight:     600,
                  fontSize:       14,
                  textDecoration: 'none',
                  transition:     'color 0.3s ease, transform 0.3s ease, text-shadow 0.3s ease',
                  /* inline-flex agar teks center di dalam anchor itu sendiri */
                  display:        'inline-flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  /* Padding simetris vertikal agar hit-area nyaman */
                  padding:        '6px 4px',
                  transform:      isActive ? 'translateY(-1px)' : 'translateY(0)',
                  textShadow:     isActive ? '0 0 12px rgba(255,107,0,0.4)' : 'none',
                  /* Underline dekoratif aktif */
                  borderBottom:   isActive
                    ? '2px solid var(--primary)'
                    : '2px solid transparent',
                  lineHeight:     1,
                }}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Right side ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2"
        style={{ position: 'relative', zIndex: 2 }}
      >
        {player ? (
          <div className="flex items-center gap-2">
            {/* Player badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <PlayerAvatar uuid={player.uuid} username={player.username} size={22} />
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {player.displayName || player.username}
              </span>
              {player.rank && player.rank !== 'default' && (
                <span
                  className="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: 'rgba(255,107,0,0.2)',
                    color:      'var(--primary-light)',
                    fontSize:   10,
                  }}
                >
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="btn-login-nav"
              style={{ color: 'var(--text-muted)', fontSize: 12 }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="btn-login-nav">
            <i className="fa-solid fa-right-to-bracket" /> Login
          </button>
        )}

        {/* Hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl"
          style={{
            background:  menuOpen ? 'rgba(255,107,0,0.12)' : 'rgba(255,255,255,0.03)',
            border:      menuOpen
              ? '1px solid rgba(255,107,0,0.4)'
              : '1px solid rgba(255,107,0,0.15)',
            color:       'var(--primary)',
            fontSize:    16,
            transition:  'all 0.3s ease',
          }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
        >
          <i
            className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}
            style={{
              transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              transform:  menuOpen
                ? 'rotate(90deg) scale(1.1)'
                : 'rotate(0deg) scale(1)',
            }}
          />
        </button>
      </div>

      {/* ── Mobile dropdown ────────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="md:hidden absolute left-0 right-0 rounded-xl p-4 flex flex-col gap-3"
          style={{
            top:           64,
            background:    'rgba(10,10,15,0.97)',
            border:        '1px solid rgba(255,107,0,0.15)',
            boxShadow:     '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter:'blur(16px)',
            animation:     'mobileMenuIn 0.32s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                color:         router.pathname === l.href ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight:    600,
                fontSize:      14,
                textDecoration:'none',
                padding:       '10px 12px',
                borderRadius:  10,
                background:    router.pathname === l.href ? 'rgba(255,107,0,0.08)' : 'transparent',
                borderLeft:    router.pathname === l.href
                  ? '2px solid var(--primary)'
                  : '2px solid transparent',
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                animation:     'menuItemIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
                animationDelay:`${i * 0.05 + 0.05}s`,
                transition:    'background 0.2s, color 0.2s',
              }}
            >
              {l.label}
            </Link>
          ))}
          {!player && (
            <button
              onClick={() => { setMenuOpen(false); onLoginClick?.(); }}
              className="btn-primary-fn justify-center w-full"
            >
              <i className="fa-solid fa-right-to-bracket" /> Login
            </button>
          )}
          {player && (
            <button
              onClick={() => { setMenuOpen(false); onLogout?.(); }}
              className="btn-ghost-fn justify-center w-full"
            >
              <i className="fa-solid fa-right-from-bracket" /> Keluar ({player.displayName || player.username})
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

// ── PlayerAvatar ──────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export function PlayerAvatar({ uuid, username, size = 28 }) {
  const isValidUUID = uuid && UUID_RE.test(uuid);
  const name        = username || 'steve';
  const fallbackUrl = `https://minotar.net/helm/${encodeURIComponent(name)}/${size * 2}`;
  const [src, setSrc] = useState(
    isValidUUID
      ? `https://crafatar.com/renders/head/${uuid}?size=${size * 2}&overlay`
      : fallbackUrl
  );
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      // ✅ PERFORMA: avatar di bawah fold, lazy load
      loading="lazy"
      decoding="async"
      style={{ borderRadius: 4, imageRendering: 'pixelated', flexShrink: 0 }}
      onError={() => setSrc(fallbackUrl)}
    />
  );
}
