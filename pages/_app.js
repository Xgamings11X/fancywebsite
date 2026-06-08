import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
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
          success: { iconTheme: { primary:'#2ecc71', secondary:'#0f0f14' } },
          error:   { iconTheme: { primary:'#e74c3c', secondary:'#0f0f14' } },
        }}
      />
    </>
  );
}
