import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
// Redis modules loaded via dynamic import in getServerSideProps
import FancyNav, { PlayerAvatar } from '../components/FancyNav';
import { useTransparentLogo } from '../components/LogoImage';
import CategoryIcon from '../components/CategoryIcon';
import ProductCard from '../components/ProductCard';
import LoginModal from '../components/LoginModal';
import CartModal  from '../components/CartModal';
import toast from 'react-hot-toast';

export async function getServerSideProps() {
  try {
    const { SettingsAsync, ProductsAsync, CategoriesAsync } = await import('../lib/redis.js');
    const [settings, allCats, allProds] = await Promise.all([
      SettingsAsync.get(),
      CategoriesAsync.active(),
      ProductsAsync.active(),
    ]);
    const categories = allCats.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const catMap     = Object.fromEntries(categories.map(c=>[c.id,c]));
    const products   = allProds
      .sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
      .map(p=>({
        ...p,
        category_name: catMap[p.category_id]?.name||null,
        category_slug: catMap[p.category_id]?.slug||null,
        category_icon: catMap[p.category_id]?.icon||null,
      }));
    return { props:{settings,categories,products} };
  } catch(e) { return { props:{settings:{},categories:[],products:[]} }; }
}

export default function StorePage({ settings, categories: initCategories, products: initProducts }) {
  const router = useRouter();
  const s = settings || {};
  const serverName = s.server_name || 'Fancy Network';
  const { src: logoSrc } = useTransparentLogo();

  const [player,     setPlayer]     = useState(null);
  const [showLogin,  setShowLogin]  = useState(false);
  const [showCart,   setShowCart]   = useState(false);
  const [cartItem,   setCartItem]   = useState(null);
  const [pendingBuy, setPendingBuy] = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');
  const [expanded,   setExpanded]   = useState({});
  const [search,     setSearch]     = useState('');
  // State produk — bisa di-update via client-side fetch
  const [products,   setProducts]   = useState(initProducts || []);
  const [categories, setCategories] = useState(initCategories || []);

  // Client-side fetch untuk memastikan data produk selalu terbaru
  // (mengatasi kasus Vercel serverless di mana /tmp/data bisa berbeda per instance)
  // BUGFIX: hanya update state jika response benar-benar punya data,
  // supaya data SSR tidak tertimpa array kosong dari instance berbeda.
  useEffect(() => {
    // Trigger page-load animation
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 80);

    fetch('/api/store/products')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Hanya update produk jika ada isi, jangan timpa data SSR dengan array kosong
          // Pastikan urutan sort_order diterapkan (no 1 dari atas ke bawah)
          if (Array.isArray(d.products) && d.products.length > 0) {
            setProducts([...d.products].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
          // Update categories dan urutkan (no 1 dari kiri ke kanan)
          if (Array.isArray(d.categories) && d.categories.length > 0) {
            setCategories([...d.categories].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
        }
      })
      .catch(() => {});
    return () => { clearTimeout(t); document.body.classList.remove('page-loaded'); };
  }, []);

  useEffect(() => {
    // Restore player dari localStorage, tapi validasi session masih aktif
    try {
      const r = localStorage.getItem('mc_player');
      if (r) {
        const savedPlayer = JSON.parse(r);
        // Verifikasi token masih valid (cookie atau localStorage token)
        const token = localStorage.getItem('mc_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/auth/me', { credentials: 'include', headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.success) {
              setPlayer(savedPlayer);
            } else {
              // Session sudah tidak valid, bersihkan state
              localStorage.removeItem('mc_player');
              localStorage.removeItem('mc_token');
            }
          })
          .catch(() => {
            // Kalau endpoint tidak ada, fallback ke restore biasa
            setPlayer(savedPlayer);
          });
      }
    } catch {}
    const { order, status, order_id, transaction_status } = router.query;

    // Redirect dari Midtrans deeplink (GoPay, dll) — pakai order_id dari query
    if (order_id) {
      router.replace('/invoice/' + order_id);
      return;
    }

    // Redirect lama dari snap popup callback
    if (order && status) {
      router.replace('/invoice/' + order);
    }
  }, [router.query]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST',credentials:'include'});
    setPlayer(null); localStorage.removeItem('mc_player');
    toast.success('Berhasil keluar');
  };

  const handleLoginSuccess = (p) => {
    setPlayer(p); localStorage.setItem('mc_player',JSON.stringify(p));
    setShowLogin(false);
    if (pendingBuy) { setCartItem(pendingBuy); setShowCart(true); setPendingBuy(null); }
  };

  // Tombol beli — muncul popup login jika belum login
  const handleBuy = (product) => {
    if (!player) { setPendingBuy(product); setShowLogin(true); }
    else         { setCartItem(product);   setShowCart(true);  }
  };

  const toggleExpand = (id) => setExpanded(p=>({...p,[id]:!p[id]}));

  const filtered = products.filter(p => {
    const matchTab  = activeTab==='all' || p.category_slug===activeTab;
    const matchSrch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSrch;
  });

  const allTabs = [
    { id:'all', label:'Semua', color:'var(--primary)' },
    ...categories.map(c=>({
      id:c.slug, label:c.name,
      color: { orange:'var(--primary)', red:'#e74c3c', purple:'#9b59b6',
               blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f' }[c.color] || 'var(--primary)',
    })),
  ];

  const categoryColor = (colorName) => {
    const map = {
      orange:'var(--primary)', red:'#e74c3c', purple:'#9b59b6',
      blue:'#3498db', green:'#2ecc71', yellow:'#f1c40f',
    };
    return map[colorName] || 'var(--primary)';
  };

  return (
    <>
      <Head>
        <title>Store — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Item Store ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
      </Head>



      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <div style={{padding:'130px 6% 80px',maxWidth:1200,margin:'0 auto',position:'relative'}}>

        {/* Ambient ember particles behind hero */}
        <div className="store-embers" aria-hidden="true">
          {[...Array(14)].map((_,i)=>(
            <span key={i} className="ember-dot" style={{
              left:`${(i*7.3)%100}%`,
              animationDuration:`${6+(i%5)*1.4}s`,
              animationDelay:`${(i%7)*0.6}s`,
              width:2+(i%3),
              height:2+(i%3),
            }}/>
          ))}
        </div>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:40,position:'relative',zIndex:1}}>
          <span className="tagline-pill anim-hero-up anim-d1" style={{display:'inline-flex',alignItems:'center',gap:10}}>
            <span style={{width:18,height:1,background:'linear-gradient(90deg,transparent,var(--primary-light))'}}/>
            DUKUNG SERVER
            <span style={{width:18,height:1,background:'linear-gradient(270deg,transparent,var(--primary-light))'}}/>
          </span>
          <h1 className="font-space flame-text anim-hero anim-d2" style={{fontSize:'clamp(40px,9vw,76px)',fontWeight:700,lineHeight:0.95,margin:'16px 0 10px',letterSpacing:-1}}>
            STORE
          </h1>
          <p className="anim-hero-up anim-d3" style={{color:'var(--text-muted)',fontSize:14}}>Semua pembelian dikirim otomatis ke Minecraft kamu</p>
          {player && (
            <div className="anim-hero-up anim-d4" style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:14,background:'rgba(46,204,113,0.08)',border:'1px solid rgba(46,204,113,0.2)',borderRadius:30,padding:'6px 16px'}}>
              <PlayerAvatar uuid={player.uuid} username={player.username} size={20}/>
              <span style={{color:'#2ecc71',fontSize:13,fontWeight:600}}>{player.displayName||player.username}</span>
              {player.rank && player.rank!=='default' && (
                <span style={{background:'rgba(255,107,0,0.2)',color:'var(--primary-light)',padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700}}>
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs + search */}
        <div data-anim="fade-up" style={{marginBottom:32,position:'relative',zIndex:1}}>
          {/* Search bar */}
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
            <div style={{position:'relative'}}>
              <i className="fa-solid fa-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:13}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari produk..." className="fn-input"
                style={{paddingLeft:36,width:220,borderRadius:10}}/>
            </div>
          </div>
          {/* Category tabs */}
          <div className="tabs-container" style={{overflowX:'auto',flexWrap:'wrap',gap:6}}>
            {allTabs.map(tab=>{
              const isActive = activeTab === tab.id;
              const col = tab.color;
              return (
                <button key={tab.id}
                  className={`tab-btn${isActive?' active':''}`}
                  onClick={()=>setActiveTab(tab.id)}
                  style={isActive
                    ? {background:col, color:'#fff', boxShadow:`0 4px 15px ${col}55`, border:'none', flex:'0 0 auto'}
                    : {flex:'0 0 auto', border:'1px solid rgba(255,255,255,0.06)'}
                  }
                  onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor=col+'88'; }}}
                  onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.color=''; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}}>
                  <span style={{
                    display:'inline-flex',alignItems:'center',justifyContent:'center',
                    width:22,height:22,background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                    borderRadius:6,flexShrink:0,color: isActive ? '#fff' : col,
                  }}>
                    <CategoryIcon slug={tab.id} size={12.5} strokeWidth={2}/>
                  </span>
                  <span>{tab.label}</span>
                  {isActive && (
                    <span style={{
                      display:'inline-flex',alignItems:'center',justifyContent:'center',
                      background:'rgba(255,255,255,0.25)',borderRadius:20,
                      fontSize:9,fontWeight:800,padding:'1px 6px',minWidth:16,
                    }}>
                      {activeTab==='all' ? products.length : products.filter(p=>p.category_slug===tab.id).length}

                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <i className="fa-solid fa-box-open" style={{fontSize:48,color:'var(--text-muted)',marginBottom:16,display:'block'}}/>
            <p style={{color:'var(--text-muted)',fontSize:15}}>{search?`Produk "${search}" tidak ditemukan`:'Belum ada produk di kategori ini'}</p>
            {search && <button onClick={()=>setSearch('')} style={{marginTop:12,background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:13}}>Hapus pencarian</button>}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {filtered.map((product, pIdx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={pIdx}
                isOpen={!!expanded[product.id]}
                onToggleExpand={toggleExpand}
                onBuy={handleBuy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fn-footer store-footer" data-anim="fade-up">
        <div className="font-space" style={{fontWeight:700,fontSize:18,marginBottom:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <svg viewBox="0 0 32 32" width="20" height="20"><path d="M16 3c-5 6-7 10-7 15a7 7 0 0014 0c0-2.4-1-3.6-1-3.6s2 1 2 4.8a9 9 0 11-18 0C6 12.5 10 9.5 16 3z" fill="var(--primary)"/></svg>
          FANCY<span style={{color:'var(--primary)'}}> NETWORK</span>
        </div>

        <ul style={{display:'flex',justifyContent:'center',gap:20,listStyle:'none',marginBottom:18,flexWrap:'wrap',padding:0}}>
          {[{href:'/',label:'Home'},{href:'/store',label:'Store'},{href:'/support',label:'Support'}].map(l => (
            <li key={l.href}><Link href={l.href} style={{color:'var(--text-muted)',textDecoration:'none',fontSize:13}}>{l.label}</Link></li>
          ))}
        </ul>

        <div className="store-footer-trust">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>
          </svg>
          Pembayaran QRIS, E-Wallet &amp; Bank Transfer — terverifikasi otomatis
        </div>

        {s.discord_url ? (
          <a href={s.discord_url} target="_blank" rel="noopener noreferrer" className="store-footer-support">
            <i className="fa-brands fa-discord"/> Butuh bantuan? Chat kami di Discord
          </a>
        ) : (
          <Link href="/support" className="store-footer-support">
            <i className="fa-solid fa-headset"/> Butuh bantuan? Buka tiket Support
          </Link>
        )}

        <div className="fn-footer-bottom" style={{marginTop:18}}>
          © 2026 {serverName}. Tidak terafiliasi dengan Mojang Studios.
        </div>
      </footer>

      {/* Login popup — muncul otomatis saat klik beli tanpa login */}
      {showLogin && (
        <LoginModal
          onClose={()=>{ setShowLogin(false); setPendingBuy(null); }}
          onSuccess={handleLoginSuccess}
          product={pendingBuy}/>
      )}

      {/* Cart / checkout */}
      {showCart && cartItem && (
        <CartModal product={cartItem} player={player}
          onClose={()=>{ setShowCart(false); setCartItem(null); }}/>
      )}

      <style jsx global>{`
        /* ── Flame gradient headline (Store hero) ───────────────── */
        .flame-text { position:relative; }
        .flame-text {
          background: linear-gradient(180deg, #fff 10%, var(--primary-light) 55%, var(--primary) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 0 30px rgba(255,107,0,0.35));
        }

        /* ── Ambient ember particles on store page ──────────────── */
        .store-embers { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0; height:480px; }
        .ember-dot {
          position:absolute; bottom:-10px; border-radius:50%;
          background: radial-gradient(circle, var(--primary-light), var(--primary) 65%, transparent 100%);
          opacity:0; animation-name: emberRise; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        @keyframes emberRise {
          0%   { transform:translateY(0) scale(1); opacity:0; }
          10%  { opacity:.85; }
          55%  { transform:translateY(-260px) translateX(14px) scale(0.85); opacity:.5; }
          100% { transform:translateY(-460px) translateX(26px) scale(0.3); opacity:0; }
        }

        /* ── Rank card — notched "forge slot" corners ────────────── */
        .rank-card {
          position: relative;
          border-radius: 18px !important;
          clip-path: polygon(
            14px 0, calc(100% - 14px) 0, 100% 14px,
            100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%,
            0 calc(100% - 14px), 0 14px
          );
        }
        .rank-card .product-img-bg { border-radius: 0 !important; }

        .rank-ribbon {
          position: absolute;
          top: 12px; left: 12px;
          z-index: 6;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          padding: 4px 9px;
          border-radius: 7px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.35);
        }

        /* ── Rank card — varian "Most Popular" (inverted, isi penuh warna aksen) ── */
        .rank-card-popular {
          background: linear-gradient(165deg, var(--primary) 0%, var(--primary) 55%, var(--primary-light) 100%) !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          box-shadow: 0 16px 40px var(--primary-glow);
        }
        .rank-card-popular:hover {
          border-color: rgba(255,255,255,0.32) !important;
          background: linear-gradient(165deg, var(--primary-light) 0%, var(--primary) 55%, var(--primary-light) 100%) !important;
        }
        .btn-popular-buy {
          background: #fff;
          color: var(--primary);
          border: none;
          padding: 11px 22px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .btn-popular-buy:hover { background: rgba(255,255,255,0.88); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
        .btn-popular-buy:active { transform: scale(0.96); }

        /* ── Store footer extras ──────────────────────────────────── */
        .store-footer-trust {
          display:flex; align-items:center; justify-content:center; gap:8px;
          color: var(--text-muted); font-size:12.5px;
          font-family: 'JetBrains Mono', 'Plus Jakarta Sans', monospace;
          margin-bottom: 14px;
        }
        .store-footer-support {
          display:inline-flex; align-items:center; gap:8px;
          color: var(--primary-light); font-size:13px; font-weight:600;
          text-decoration:none; padding:8px 16px; border-radius:30px;
          background: rgba(255,107,0,0.08); border:1px solid rgba(255,107,0,0.2);
          transition: all 0.25s;
        }
        .store-footer-support:hover { background: rgba(255,107,0,0.16); transform: translateY(-2px); }

        @media (prefers-reduced-motion: reduce) {
          .ember-dot { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </>
  );
}
