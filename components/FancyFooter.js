/**
 * components/FancyFooter.js — Komponen footer global yang dipakai di semua halaman.
 * Import sekali, update sekali → semua halaman (landing, store, support) ikut sama persis.
 */
import Link from 'next/link';
import Icon from './Icon';

export default function FancyFooter({ serverName = 'Fancy Network', discordUrl = '' }) {
  return (
    <footer className="fn-footer" data-anim="fade-up">
      <div className="font-space footer-brand-row">
        <svg viewBox="0 0 32 32" width="20" height="20"><path d="M16 3c-5 6-7 10-7 15a7 7 0 0014 0c0-2.4-1-3.6-1-3.6s2 1 2 4.8a9 9 0 11-18 0C6 12.5 10 9.5 16 3z" fill="var(--primary)"/></svg>
        FANCY<span className="footer-brand-accent"> NETWORK</span>
      </div>

      <ul className="footer-nav-list">
        {[
          { href: '/',        label: 'Home'    },
          { href: '/store',   label: 'Store'   },
          { href: '/support', label: 'Support' },
        ].map(l => (
          <li key={l.href}>
            <Link href={l.href} className="footer-nav-link">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="fn-footer-trust">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>
        </svg>
        Pembayaran QRIS, E-Wallet &amp; Bank Transfer — terverifikasi otomatis
      </div>

      {discordUrl ? (
        <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="fn-footer-support">
          <Icon name="discord" size={14} className="fn-icon-mr-7"/> Butuh bantuan? Chat kami di Discord
        </a>
      ) : (
        <Link href="/support" className="fn-footer-support">
          🎧 Butuh bantuan? Buka tiket Support
        </Link>
      )}

      <div className="fn-footer-bottom footer-bottom">
        © {new Date().getFullYear()} {serverName}. Tidak terafiliasi dengan Mojang Studios.
      </div>
    </footer>
  );
}
