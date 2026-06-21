import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
// Redis modules loaded via dynamic import in getServerSideProps
import FancyNav, { PlayerAvatar } from '../components/FancyNav';
import FancyFooter from '../components/FancyFooter';
import { useTransparentLogo } from '../components/LogoImage';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

// ── Code-splitting: modal hanya dibutuhkan SETELAH user klik
// "Login" / "Beli" — jangan ikut bundle awal store.js.
// ssr:false aman karena 100% interaksi client (form, popup Snap).
const LoginModal = dynamic(() => import('../components/LoginModal'), { ssr: false });
const CartModal  = dynamic(() => import('../components/CartModal'),  { ssr: false });

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

  // colorName disimpan terpisah dari nilai CSS yang sudah di-resolve,
  // dipakai sebagai modifier class (tab-accent-X) — bukan inline style.
  const allTabs = [
    { id:'all', label:'Semua', colorName:'orange' },
    ...categories.map(c=>({
      id:c.slug, label:c.name, colorName: c.color || 'orange',
    })),
  ];

  return (
    <>
      <Head>
        <title>Store — {serverName}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="description" content={`Item Store ${serverName}`}/>
        <link rel="icon" type="image/png" href={s.logo_url || logoSrc || '/favicon.png'}/>
      </Head>

      <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

      <div className="store-page-wrap">

        {/* Ambient ember particles behind hero */}
        <div className="store-embers" aria-hidden="true">
          {[...Array(14)].map((_,i)=>(
            <span key={i} className="ember-dot" style={{
              '--left': `${(i*7.3)%100}%`,
              '--dur':  `${6+(i%5)*1.4}s`,
              '--edelay': `${(i%7)*0.6}s`,
              '--size': `${2+(i%3)}px`,
            }}/>
          ))}
        </div>

        {/* Header */}
        <div className="store-hero-header">
          <span className="tagline-pill anim-hero-up anim-d1 flex items-center gap-2.5">
            <span className="store-tagline-divider-l"/>
            DUKUNG SERVER
            <span className="store-tagline-divider-r"/>
          </span>
          <h1 className="font-space flame-text anim-hero anim-d2 store-title">
            STORE
          </h1>
          <p className="anim-hero-up anim-d3 store-subtitle">Semua pembelian dikirim otomatis ke Minecraft kamu</p>
          {player && (
            <div className="anim-hero-up anim-d4 store-player-badge">
              <PlayerAvatar uuid={player.uuid} username={player.username} size={20}/>
              <span className="store-player-name">{player.displayName||player.username}</span>
              {player.rank && player.rank!=='default' && (
                <span className="store-player-rank">
                  {player.rank.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs + search */}
        <div data-anim="fade-up" className="store-tabs-wrap">
          {/* Search bar */}
          <div className="store-search-row">
            <div className="store-search-box">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24" width="13" height="13" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className="store-search-icon"
              >
                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
              </svg>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari produk..." className="fn-input store-search-input"
                aria-label="Cari produk"/>
            </div>
          </div>
          {/* Category tabs */}
          <div className="tabs-container scrollable">
            {allTabs.map(tab=>{
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id}
                  className={`tab-btn tab-accent-${tab.colorName}${isActive?' active':''}`}
                  onClick={()=>setActiveTab(tab.id)}>
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="tab-count-badge">
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
          <div className="store-empty-state">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="48" height="48" fill="none"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              className="store-empty-icon">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p className="store-empty-text">{search?`Produk "${search}" tidak ditemukan`:'Belum ada produk di kategori ini'}</p>
            {search && <button onClick={()=>setSearch('')} className="store-empty-clear-btn">Hapus pencarian</button>}
          </div>
        ) : (
          <div className="store-products-grid">
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

      {/* Footer — komponen shared, identik dengan landing & support page */}
      <FancyFooter serverName={serverName} discordUrl={s.discord_url} />

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
    </>
  );
}
