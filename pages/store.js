import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from '../components/Icon';
import { useRouter } from 'next/router';
import FancyNav, { PlayerAvatar } from '../components/FancyNav';
import { useTransparentLogo } from '../components/LogoImage';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';
import FancyFooter from '../components/FancyFooter'; // Menggunakan footer warm bawaan agar seragam

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
  const [products,   setProducts]   = useState(initProducts || []);
  const [categories, setCategories] = useState(initCategories || []);

  useEffect(() => {
    const t = setTimeout(() => document.body.classList.add('page-loaded'), 80);
    fetch('/api/store/products')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (Array.isArray(d.products) && d.products.length > 0) {
            setProducts([...d.products].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
          if (Array.isArray(d.categories) && d.categories.length > 0) {
            setCategories([...d.categories].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)));
          }
        }
      })
      .catch(() => {});
    return () => { clearTimeout(t); document.body.classList.remove('page-loaded'); };
  }, []);

  useEffect(() => {
    try {
      const r = localStorage.getItem('mc_player');
      if (r) {
        const savedPlayer = JSON.parse(r);
        const token = localStorage.getItem('mc_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/auth/me', { credentials: 'include', headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.success) { setPlayer(savedPlayer); } 
            else { localStorage.removeItem('mc_player'); localStorage.removeItem('mc_token'); }
          })
          .catch(() => { setPlayer(savedPlayer); });
      }
    } catch {}
    
    const { order, status, order_id } = router.query;
    if (order_id) { router.replace('/invoice/' + order_id); return; }
    if (order && status) { router.replace('/invoice/' + order); }
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

  // Sistem Tab warna ter-sinkronisasi dengan tema orange hangat
  const allTabs = [
    { id:'all', label:'Semua', color:'#FF6B00' },
    ...categories.map(c=>({
      id:c.slug, label:c.name,
      color: { orange:'#FF6B00', red:'#DC2626', purple:'#7C3AED', blue:'#2563EB', green:'#16A34A', yellow:'#D97706' }[c.color] || '#FF6B00',
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

      <div style={{ backgroundColor: '#FFFDFB', color: '#3F2C24', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
        
        {/* Ambient Warm Sunset Glow Background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-5%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 75%)', filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', top: '30%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(217,119,6,0.04) 0%, transparent 75%)', filter: 'blur(90px)' }} />
        </div>

        <FancyNav player={player} onLoginClick={()=>setShowLogin(true)} onLogout={handleLogout} settings={s}/>

        <div style={{padding:'140px 6% 80px', maxWidth:1200, margin:'0 auto', position:'relative', zIndex: 1}}>

          {/* Header */}
          <div style={{textAlign:'center', marginBottom:48}}>
            <span style={{display:'inline-flex', alignItems:'center', gap:10, padding:'6px 16px', borderRadius:'50px', background:'#FFF1E6', color:'#C2410C', fontWeight:700, fontSize:11, letterSpacing:'0.5px'}}>
              DUKUNG SERVER KAMI
            </span>
            <h1 className="font-space" style={{fontSize:'clamp(42px, 8vw, 68px)', fontWeight:800, color:'#18181B', margin:'16px 0 8px', letterSpacing:'-1px'}}>
              STORE <span style={{ color: '#FF6B00' }}>FANCY</span>
            </h1>
            <p style={{color:'#78350F', fontSize:14.5, maxWidth:500, margin:'0 auto'}}>Setiap donasi membantu server tetap online. Item otomatis masuk secara instan!</p>
            
            {player && (
              <div style={{display:'inline-flex', alignItems:'center', gap:8, marginTop:18, background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:30, padding:'6px 16px'}}>
                <PlayerAvatar uuid={player.uuid} username={player.username} size={20}/>
                <span style={{color:'#16A34A', fontSize:13, fontWeight:700}}>{player.displayName||player.username}</span>
                {player.rank && player.rank!=='default' && (
                  <span style={{background:'#FFEDD5', color:'#EA580C', padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:800}}>
                    {player.rank.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Filter & Search Toolbar */}
          <div style={{marginBottom:32, display:'flex', flexDirection:'column', gap:16}}>
            {/* Search bar */}
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <div style={{position:'relative', width: '100%', maxWidth: 260}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:0.6}}>
                  <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                </svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari item/package..." style={{width:'100%', padding:'10px 14px 10px 38px', borderRadius:12, border:'1px solid #FFEDD5', background:'#FFFFFF', fontSize:13.5, color:'#18181B', outline:'none', focusBorderColor:'#FF6B00'}}/>
              </div>
            </div>

            {/* Category tabs */}
            <div style={{display:'flex', gap:8, overflowX:'auto', paddingBottom:6, scrollbarWidth:'none'}}>
              {allTabs.map(tab=>{
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    style={isActive
                      ? {background: tab.color, color:'#fff', padding:'10px 18px', borderRadius:12, fontWeight:700, border:'none', fontSize:13, boxShadow:`0 4px 14px ${tab.color}35`, cursor:'pointer', whiteSpace:'nowrap'}
                      : {background:'#FFFFFF', color:'#5B3E31', padding:'10px 18px', borderRadius:12, fontWeight:600, border:'1px solid #FFEDD5', fontSize:13, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap'}
                    }>
                    <span>{tab.label}</span>
                    <span style={{marginLeft: 6, fontSize:10, opacity: 0.8, background: isActive ? 'rgba(255,255,255,0.2)' : '#FFF1E6', color: isActive ? '#fff' : '#C2410C', padding:'1px 6px', borderRadius:6, fontWeight:700}}>
                      {tab.id==='all' ? products.length : products.filter(p=>p.category_slug===tab.id).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products View */}
          {filtered.length === 0 ? (
            <div style={{textAlign:'center', padding:'80px 0', background:'#FFFFFF', borderRadius:20, border:'1px solid #FFEDD5'}}>
              <p style={{color:'#78350F', fontSize:14.5, fontWeight:600}}>{search?`Produk "${search}" tidak ditemukan`:'Belum ada produk di kategori ini'}</p>
              {search && <button onClick={()=>setSearch('')} style={{marginTop:12, background:'none', border:'none', color:'#FF6B00', cursor:'pointer', fontSize:13, fontWeight:700, textDecoration:'underline'}}>Reset Pencarian</button>}
            </div>
          ) : (
            <div className="store-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20}}>
              {filtered.map((product, pIdx) => (
                <div key={product.id} className="store-product-wrapper">
                  <ProductCard product={product} index={pIdx} isOpen={!!expanded[product.id]} onToggleExpand={toggleExpand} onBuy={handleBuy} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{background:'#FFFFFF', borderTop:'1px solid #FFEDD5', padding:'40px 24px', textAlign:'center'}}>
          <div className="store-footer-trust" style={{color:'#78350F', fontSize:13, fontWeight:600, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
            <Icon name="shield-halved" size={14} color="#FF6B00" />
            Pembayaran QRIS, ShopeePay, OVO, &amp; VA Bank Transfer terverifikasi otomatis
          </div>
          {s.discord_url ? (
            <a href={s.discord_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex', alignItems:'center', gap:8, color:'#FFFFFF', fontSize:13, fontWeight:700, background:'#FF6B00', padding:'10px 20px', borderRadius:12, textDecoration:'none'}}>
              <Icon name="discord" size={14}/> Butuh bantuan? Hubungi Kami di Discord
            </a>
          ) : (
            <Link href="/support" style={{color:'#FF6B00', fontWeight:700, fontSize:13, textDecoration:'none'}}>🎧 Butuh bantuan? Buka Tiket Support</Link>
          )}
          <div style={{marginTop:24, fontSize:12, color:'#A16207'}}>
            © 2026 {serverName}. Server ini tidak berafiliasi dengan Mojang Studios.
          </div>
        </footer>

        {showLogin && <LoginModal onClose={()=>{ setShowLogin(false); setPendingBuy(null); }} onSuccess={handleLoginSuccess} product={pendingBuy}/>}
        {showCart && cartItem && <CartModal product={cartItem} player={player} onClose={()=>{ setShowCart(false); setCartItem(null); }}/>}
      </div>

      <style jsx global>{`
        /* Overriding global styles internal elements card store agar seragam orange */
        .store-product-wrapper .btn-buy, 
        .store-product-wrapper button {
          border-radius: 10px !important;
        }
        /* Mencegah lag scroll tab horizontal di smartphone */
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
