import '../styles/globals.css';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';

function initScrollObserver() {
  const els = document.querySelectorAll('[data-anim]');
  if (!els.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [bgDesktop, setBgDesktop] = useState('');
  const [bgMobile,  setBgMobile]  = useState('');

  // ── Load background settings once on mount ──
  useEffect(() => {
    fetch('/api/admin/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setBgDesktop(d.settings.bg_desktop || '');
          setBgMobile(d.settings.bg_mobile  || '');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // ── Page transition overlay ──
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    document.body.appendChild(overlay);

    // ── Scroll progress bar ──
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    // ── Cursor glow ──
    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    document.body.appendChild(glow);

    const onMouseMove = (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onScroll = () => {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      const pct      = total > 0 ? scrolled / total : 0;
      bar.style.transform = `scaleX(${pct})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Route change transitions ──
    const handleStart = () => {
      overlay.classList.add('transitioning');
    };
    const handleDone = () => {
      overlay.classList.remove('transitioning');
      // reset scroll obs after navigation
      setTimeout(() => initScrollObserver(), 100);
    };
    router.events.on('routeChangeStart',    handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError',    handleDone);

    // Initial scroll observer
    const cleanup = initScrollObserver();

    return () => {
      router.events.off('routeChangeStart',    handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError',    handleDone);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll',    onScroll);
      cleanup();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (bar.parentNode)     bar.parentNode.removeChild(bar);
      if (glow.parentNode)    glow.parentNode.removeChild(glow);
    };
  }, [router]);

  // Re-run observer on every render (catches dynamic content)
  useEffect(() => {
    const cleanup = initScrollObserver();
    return cleanup;
  });

  return (
    <>
      {/* Dynamic background from admin settings */}
      {(bgDesktop || bgMobile) && (
        <style>{`
          body::before {
            background-image: url('${bgDesktop || bgMobile}') !important;
          }
          ${bgMobile ? `
          @media (max-width: 768px) {
            body::before {
              background-image: url('${bgMobile}') !important;
              background-position: center center !important;
            }
          }` : ''}
        `}</style>
      )}
      <Component {...pageProps} />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#0f0f14',
            color: '#f4f4f6',
            border: '1px solid rgba(255,107,0,0.2)',
            borderRadius: '30px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 13,
            padding: '10px 20px',
          },
          success: { iconTheme: { primary: '#2ecc71', secondary: '#0f0f14' } },
          error:   { iconTheme: { primary: '#e74c3c', secondary: '#0f0f14' } },
        }}
      />
    </>
  );
}
