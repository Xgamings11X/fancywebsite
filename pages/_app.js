import '../styles/globals.css';
import '../styles/performance.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const Toaster = dynamic(() => import('react-hot-toast').then((m) => m.Toaster), { ssr: false });

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

  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    document.body.appendChild(overlay);

    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    const onScroll = () => {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      const pct      = total > 0 ? scrolled / total : 0;
      bar.style.transform = `scaleX(${pct})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let cleanupObserver = initScrollObserver();
    const refreshObserver = () => {
      cleanupObserver();
      cleanupObserver = initScrollObserver();
    };

    const handleStart = () => {
      overlay.classList.add('transitioning');
    };
    const handleDone = () => {
      overlay.classList.remove('transitioning');
      window.setTimeout(refreshObserver, 100);
    };
    router.events.on('routeChangeStart',    handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError',    handleDone);

    return () => {
      router.events.off('routeChangeStart',    handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError',    handleDone);
      window.removeEventListener('scroll', onScroll);
      cleanupObserver();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (bar.parentNode)     bar.parentNode.removeChild(bar);
    };
  }, [router]);

  return (
    <>
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
