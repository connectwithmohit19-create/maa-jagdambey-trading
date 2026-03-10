import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCatalogueProducts, getCatalogueCategories } from '../../lib/api';

const CONTACT_NUMBER  = '8933064002';
const CONTACT_DISPLAY = '+91 89330 64002';

const CATEGORY_ICONS = {
  'AC': '❄️', 'Air Conditioner': '❄️', 'Washing Machine': '🫧',
  'Refrigerator': '🧊', 'LED TV': '📺', 'Television': '📺',
  'Microwave': '🔆', 'Geyser': '🚿', 'Cooler': '💨',
  'Fan': '🌀', 'Sound': '🔊', 'Audio': '🎵',
  'Kitchen Appliances': '🍳', 'Small Appliances': '🔌',
};
const getCatIcon = (name) => CATEGORY_ICONS[name] || '⚡';

// ── Share Modal ───────────────────────────────────────────────
function ShareModal({ product, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!product) return null;
  const shareUrl  = `${window.location.origin}/catalogue/${product.product_id}`;
  const shareText = `Check out *${product.product_name}*${product.brand ? ` by ${product.brand}` : ''} at Maa Jagdambey Trading!\n\n🔗 ${shareUrl}\n\n📞 Price enquiry: ${CONTACT_DISPLAY}`;

  const copy = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(61,39,48,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-warm-lg border border-beige-400" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-beige-300">
          <div>
            <p className="text-xs text-warm-500 font-medium">Share Product</p>
            <h3 className="font-semibold text-warm-900 text-sm mt-0.5 leading-snug">{product.product_name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-warm-400 hover:bg-beige-200 flex-shrink-0 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 bg-beige-50 border border-beige-300 rounded-xl p-3">
            <p className="flex-1 text-xs text-warm-500 truncate font-mono">{shareUrl}</p>
            <button onClick={copy} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-maroon-600 text-white hover:bg-maroon-700'}`}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe59] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </a>
          {typeof navigator.share === 'function' && (
            <button onClick={() => navigator.share({ title: product.product_name, text: shareText, url: shareUrl }).catch(() => {})}
              className="w-full py-2.5 border border-beige-400 text-warm-700 rounded-xl text-sm font-semibold hover:bg-beige-100 transition-colors">
              More sharing options…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, onShare }) {
  const navigate = useNavigate();

  const handleWA = (e) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`Hi, I'm interested in *${product.product_name}*${product.brand ? ` (${product.brand})` : ''}.\nPlease share the price and availability.`);
    window.open(`https://wa.me/${CONTACT_NUMBER}?text=${msg}`, '_blank');
  };

  return (
    <div onClick={() => navigate(`/catalogue/${product.product_id}`)}
      className="bg-white rounded-2xl border border-beige-300 shadow-warm-sm hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col">

      {/* Image */}
      <div className="aspect-square bg-beige-gradient relative overflow-hidden">
        {product.product_image_url ? (
          <img src={product.product_image_url} alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { e.target.style.display = 'none'; }}/>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-5xl">{getCatIcon(product.category_name)}</span>
            <span className="text-xs text-warm-400 font-medium">{product.brand || '—'}</span>
          </div>
        )}
        {/* Economy tag badge */}
        {product.is_economy_series && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-warm-sm">
              💰 Economy
            </span>
          </div>
        )}
        {/* Share button — appears on hover */}
        <button onClick={e => { e.stopPropagation(); onShare(product); }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-warm-500 hover:text-maroon-600 hover:bg-white transition-all shadow-warm-sm opacity-0 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-warm-400 font-medium truncate">{product.brand}{product.model_number ? ` · ${product.model_number}` : ''}</p>
        <h3 className="text-sm font-semibold text-warm-900 mt-0.5 line-clamp-2 leading-snug flex-1">{product.product_name}</h3>

        {product.warranty_period && (
          <p className="text-xs text-green-700 font-medium mt-2">🛡 {product.warranty_period} Warranty</p>
        )}

        {/* CTA strip */}
        <div className="mt-3 pt-3 border-t border-beige-200 space-y-2">
          <p className="text-xs text-warm-500 text-center font-medium">Price on Request</p>
          <div className="flex gap-1.5">
            <button onClick={handleWA}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-semibold hover:bg-[#1ebe59] transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <a href={`tel:${CONTACT_NUMBER}`} onClick={e => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-maroon-600 text-white rounded-lg text-xs font-semibold hover:bg-maroon-700 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" /></svg>
              Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function Catalogue() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]         = useState(true);
  const [shareProduct, setShare]      = useState(null);

  const [search, setSearch]           = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId]   = useState(searchParams.get('category') || '');
  const [economyOnly, setEconomy]     = useState(searchParams.get('economy') === 'true');

  // Debounce search
  const [debSearch, setDebSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load categories once
  useEffect(() => {
    getCatalogueCategories().then(r => setCategories(r.data.categories)).catch(console.error);
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (debSearch)   params.search = debSearch;
      if (categoryId)  params.category_id = categoryId;
      if (economyOnly) params.economy_series = 'true';

      const sp = {};
      if (debSearch)   sp.search = debSearch;
      if (categoryId)  sp.category = categoryId;
      if (economyOnly) sp.economy = 'true';
      setSearchParams(sp, { replace: true });

      const res = await getCatalogueProducts(params);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [debSearch, categoryId, economyOnly, setSearchParams]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const selectedCat = categories.find(c => String(c.category_id) === categoryId);
  const hasFilters  = search || categoryId || economyOnly;

  return (
    <div className="min-h-screen" style={{ background: '#EFDFCE' }}>

      {/* ── Header ── */}
      <header style={{ background: '#3d2730' }} className="sticky top-0 z-30 shadow-warm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8f6069, #6e4850)' }}>
            <span className="text-white font-bold text-lg font-display">M</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-white text-sm leading-tight">Maa Jagdambey Trading</h1>
            <p className="text-xs" style={{ color: '#d4adb2' }}>Electronics &amp; Appliances — Lucknow</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <a href={`https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent('Hi, I want to enquire about your products.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: '#25D366' }}>
              WhatsApp
            </a>
            <a href={`tel:${CONTACT_NUMBER}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: '#8f6069' }}>
              📞 {CONTACT_DISPLAY}
            </a>
          </div>
          <button onClick={() => navigate('/portal/login')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: '#6e4850', color: '#d4adb2' }}>
            My Account
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="py-10 px-4" style={{ background: 'linear-gradient(135deg, #4a2e34 0%, #3d2730 60%, #261e19 100%)' }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#d4adb2' }}>
            Wholesale · Lucknow
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">Our Product Catalogue</h2>
          <p className="mt-2 text-sm" style={{ color: '#b98089' }}>
            Browse our full range. No prices shown — contact us for best rates.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <a href={`https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent('Hi, I want to make a product enquiry.')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-warm-md transition-colors"
              style={{ background: '#25D366' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Enquiry
            </a>
            <a href={`tel:${CONTACT_NUMBER}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-warm-md"
              style={{ background: '#8f6069' }}>
              📞 {CONTACT_DISPLAY}
            </a>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="sticky top-[57px] z-20 border-b"
        style={{ background: 'white', borderColor: '#e5ccb5' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, brand or model…"
              className="input-field pl-9" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Category chips + Economy toggle */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
            {/* All */}
            <button onClick={() => setCategoryId('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !categoryId ? 'text-white border-transparent' : 'bg-white text-warm-600 border-beige-400 hover:border-maroon-300'
              }`}
              style={!categoryId ? { background: '#3d2730', borderColor: '#3d2730' } : {}}>
              All
            </button>

            {categories.map(cat => {
              const active = String(cat.category_id) === categoryId;
              return (
                <button key={cat.category_id}
                  onClick={() => setCategoryId(active ? '' : String(cat.category_id))}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                    active ? 'text-white border-transparent' : 'bg-white text-warm-600 border-beige-400 hover:border-maroon-300'
                  }`}
                  style={active ? { background: '#8f6069', borderColor: '#8f6069' } : {}}>
                  {getCatIcon(cat.category_name)} {cat.category_name}
                </button>
              );
            })}

            {/* Economy Series — special toggle */}
            <div className="flex-shrink-0 w-px h-5 bg-beige-400 mx-1" />
            <button onClick={() => setEconomy(!economyOnly)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all whitespace-nowrap ${
                economyOnly ? 'border-amber-400 text-amber-800' : 'bg-white text-warm-600 border-beige-400 hover:border-amber-300'
              }`}
              style={economyOnly ? { background: '#fef3c7' } : {}}>
              💰 Economy Series
              {economyOnly && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
            </button>
          </div>

          {/* Active filter summary */}
          {hasFilters && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-warm-500">
                {categoryId && selectedCat && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-maroon-50 border border-maroon-200 text-maroon-700 rounded-full font-medium">
                    {getCatIcon(selectedCat.category_name)} {selectedCat.category_name}
                    <button onClick={() => setCategoryId('')} className="ml-0.5 hover:text-maroon-900">×</button>
                  </span>
                )}
                {economyOnly && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-full font-medium">
                    💰 Economy Series
                    <button onClick={() => setEconomy(false)} className="ml-0.5 hover:text-amber-900">×</button>
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-beige-100 border border-beige-400 text-warm-600 rounded-full font-medium">
                    "{search}"
                    <button onClick={() => setSearch('')} className="ml-0.5 hover:text-warm-900">×</button>
                  </span>
                )}
              </div>
              <button onClick={() => { setSearch(''); setCategoryId(''); setEconomy(false); }}
                className="text-maroon-600 hover:underline font-medium">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Products grid ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium" style={{ color: '#6e4850' }}>
            {loading ? 'Loading…' : `${pagination.total} product${pagination.total !== 1 ? 's' : ''}${selectedCat ? ` in ${selectedCat.category_name}` : ''}${economyOnly ? ' · Economy Series' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-beige-300 overflow-hidden">
                <div className="aspect-square shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-2.5 shimmer rounded-full w-1/2" />
                  <div className="h-4 shimmer rounded-full" />
                  <div className="h-4 shimmer rounded-full w-3/4" />
                  <div className="h-8 shimmer rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-6xl mb-4">🔍</p>
            <p className="font-semibold text-warm-800">No products found</p>
            <p className="text-warm-500 text-sm mt-1">Try changing the filters or search term</p>
            <button onClick={() => { setSearch(''); setCategoryId(''); setEconomy(false); }}
              className="mt-5 btn-primary px-6 py-2.5">Browse All</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map(p => (
                <ProductCard key={p.product_id} product={p} onShare={setShare} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button onClick={() => fetchProducts(pagination.page - 1)} disabled={pagination.page === 1}
                  className="btn-secondary disabled:opacity-40">← Previous</button>
                <span className="text-sm text-warm-500">Page {pagination.page} of {pagination.pages}</span>
                <button onClick={() => fetchProducts(pagination.page + 1)} disabled={pagination.page === pagination.pages}
                  className="btn-secondary disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-8 py-8 px-4 text-center" style={{ background: '#3d2730' }}>
        <p className="font-display font-bold text-white text-base">Maa Jagdambey Trading</p>
        <p className="text-sm mt-1" style={{ color: '#b98089' }}>Electronics &amp; Appliances Wholesale · Lucknow, UP</p>
        <div className="flex items-center justify-center gap-5 mt-3">
          <a href={`tel:${CONTACT_NUMBER}`} className="text-sm font-medium" style={{ color: '#d4adb2' }}>📞 {CONTACT_DISPLAY}</a>
          <a href={`https://wa.me/${CONTACT_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#25D366]">💬 WhatsApp</a>
        </div>
      </footer>

      {shareProduct && <ShareModal product={shareProduct} onClose={() => setShare(null)} />}
    </div>
  );
}
