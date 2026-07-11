import Link from 'next/link';
import Icon from './Icon';

export default function FancyFooter({ serverName = 'Fancy Network', discordUrl = '' }) {
  const year = new Date().getFullYear();

  return (
    <footer className="fn-footer" data-anim="fade-up">
      <div className="fn-footer-main">
        <div className="fn-footer-brand-block">
          <div className="font-space footer-brand-row">
            <span className="fn-footer-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="20" height="20"><path d="M16 3c-5 6-7 10-7 15a7 7 0 0014 0c0-2.4-1-3.6-1-3.6s2 1 2 4.8a9 9 0 11-18 0C6 12.5 10 9.5 16 3z" fill="currentColor"/></svg>
            </span>
            {serverName}
          </div>
          <p>Server Minecraft Indonesia untuk Java dan Bedrock dengan komunitas aktif, progres seru, dan dukungan yang responsif.</p>
        </div>

        <div className="fn-footer-links-block">
          <span>Navigasi</span>
          <ul className="footer-nav-list">
            {[
              { href:'/', label:'Home' },
              { href:'/store', label:'Store' },
              { href:'/support', label:'Support' },
            ].map(link => (
              <li key={link.href}><Link href={link.href} className="footer-nav-link">{link.label}</Link></li>
            ))}
          </ul>
        </div>

        <div className="fn-footer-help-block">
          <span>Butuh bantuan?</span>
          <p>Tim kami siap membantu masalah transaksi, akun, dan pertanyaan seputar server.</p>
          {discordUrl ? (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="fn-footer-support">
              <Icon name="discord" size={15}/> Chat di Discord
            </a>
          ) : (
            <Link href="/support" className="fn-footer-support">
              <Icon name="ticket" size={15}/> Buka tiket Support
            </Link>
          )}
        </div>
      </div>

      <div className="fn-footer-trust">
        <Icon name="credit-card" size={14}/>
        Pembayaran QRIS, E-Wallet, dan transfer bank diverifikasi otomatis.
      </div>

      <div className="fn-footer-bottom footer-bottom">
        <span>© {year} {serverName}. Semua hak dilindungi.</span>
        <span>Tidak terafiliasi dengan Mojang Studios atau Microsoft.</span>
      </div>
    </footer>
  );
}
