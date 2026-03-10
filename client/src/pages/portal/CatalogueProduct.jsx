import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCatalogueProduct } from '../../lib/api';

const CONTACT_NUMBER  = '8933064002';
const CONTACT_DISPLAY = '+91 89330 64002';

const CAT_ICONS = {
  'AC': '❄️', 'Air Conditioner': '❄️', 'Washing Machine': '🫧',
  'Refrigerator': '🧊', 'LED TV': '📺', 'Sound': '🔊', 'Audio': '🎵',
  'Microwave': '🔆', 'Geyser': '🚿', 'Cooler': '💨', 'Fan': '🌀',
};
const getCatIcon = (n) => CAT_ICONS[n] || '⚡';

export default function CatalogueProduct() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [imgErr, setImgErr]   = useState(false);

  useEffect(() => {
    getCatalogueProduct(id)
      .then(r => setProduct(r.data.product))
      .catch(() => navigate('/catalogue'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EFDFCE' }}>
      <div className="w-10 h-10 border-4 border-beige-400 rounded-full animate-spin" style={{ borderTopColor: '#8f6069' }} />
    </div>
  );
  if (!product) return null;

  const shareUrl  = `${window.location.origin}/catalogue/${product.product_id}`;
  const waEnquiry = `https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in *${product.product_name}*${product.brand ? ` (${product.brand})` : ''}.\n\nProduct: ${shareUrl}\n\nPlease share the price.`)}`;
  const waShare   = `https://wa.me/?text=${encodeURIComponent(`Check out *${product.product_name}*${product.brand ? ` by ${product.brand}` : ''} at Maa Jagdambey Trading!\n\n🔗 ${shareUrl}\n\n📞 ${CONTACT_DISPLAY}`)}`;

  const copy = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  let specs = null;
  try { specs = product.specifications ? (typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications) : null; } catch (_) {}

  return (
    <div className="min-h-screen" style={{ background: '#EFDFCE' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 shadow-warm" style={{ background: '#3d2730' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/catalogue')}
            className="p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: '#d4adb2' }}
            onMouseEnter={e => e.currentTarget.style.background = '#4a2e34'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{product.product_name}</p>
            <p className="text-xs truncate" style={{ color: '#b98089' }}>{product.category_name}</p>
          </div>
          <a href={`tel:${CONTACT_NUMBER}`}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: '#8f6069' }}>
            📞 Call
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Left — image */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden border border-beige-400 shadow-warm relative"
              style={{ background: 'linear-gradient(135deg, #fdfaf7, #efdfce)' }}>
              {product.product_image_url && !imgErr ? (
                <img src={product.product_image_url} alt={product.product_name}
                  className="w-full h-full object-cover" onError={() => setImgErr(true)} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="text-8xl">{getCatIcon(product.category_name)}</span>
                  <span className="text-sm font-medium text-warm-400">{product.brand || 'Product'}</span>
                </div>
              )}
              {product.is_economy_series && (
                <div className="absolute top-3 left-3">
                  <span className="flex items-center gap-1 bg-amber-50 border-2 border-amber-300 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-warm-sm">
                    💰 Economy Series
                  </span>
                </div>
              )}
            </div>

            {/* Share box — desktop */}
            <div className="mt-4 p-4 bg-white rounded-2xl border border-beige-300 shadow-warm-sm hidden md:block">
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-3">Share This Product</p>
              <div className="flex gap-2 mb-2">
                <a href={waShare} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: '#25D366' }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                <button onClick={copy}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-beige-400 text-warm-700 hover:bg-beige-100'}`}>
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-beige-50 border border-beige-300 rounded-xl px-3 py-2">
                <p className="text-xs text-warm-400 font-mono truncate">{shareUrl}</p>
              </div>
            </div>
          </div>

          {/* Right — info */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8f6069' }}>{product.brand}</span>
                {product.is_economy_series && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border-2 border-amber-300 text-amber-700 bg-amber-50">💰 Economy</span>
                )}
              </div>
              <h1 className="font-display font-bold text-2xl text-warm-900 leading-tight">{product.product_name}</h1>
              {product.model_number && <p className="text-sm text-warm-400 mt-1">Model: {product.model_number}</p>}
            </div>

            {/* Price on request box */}
            <div className="rounded-2xl p-5 border-2"
              style={{ background: 'linear-gradient(135deg, #fdf5f6, #f5e6e8)', borderColor: '#d4adb2' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💰</span>
                <p className="font-bold text-warm-900">Price on Request</p>
              </div>
              <p className="text-sm text-warm-500 mb-4">Contact us for wholesale &amp; retail pricing</p>
              <div className="space-y-2.5">
                <a href={waEnquiry} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white shadow-warm-sm transition-colors"
                  style={{ background: '#25D366' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Price Enquiry
                </a>
                <a href={`tel:${CONTACT_NUMBER}`}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white shadow-warm-sm transition-colors"
                  style={{ background: '#8f6069' }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" /></svg>
                  Call {CONTACT_DISPLAY}
                </a>
              </div>
            </div>

            {/* Quick pills */}
            <div className="flex flex-wrap gap-2">
              {product.warranty_period && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border" style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}>
                  🛡️ {product.warranty_period} Warranty{product.warranty_type ? ` · ${product.warranty_type}` : ''}
                </span>
              )}
              {product.gst_percentage && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border" style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1e40af' }}>
                  GST {product.gst_percentage}%
                </span>
              )}
              {product.hsn_code && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-beige-400 text-warm-600 bg-beige-50">
                  HSN {product.hsn_code}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-semibold text-warm-700 mb-2">About this product</h3>
                <p className="text-sm text-warm-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {specs && Object.keys(specs).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-warm-700 mb-2">Specifications</h3>
                <div className="rounded-xl overflow-hidden border border-beige-300">
                  {Object.entries(specs).map(([k, v], i) => (
                    <div key={k} className="flex text-sm"
                      style={{ background: i % 2 === 0 ? 'white' : '#fdfaf7' }}>
                      <span className="w-36 flex-shrink-0 px-4 py-2.5 text-warm-400 font-medium capitalize border-r border-beige-200">{k.replace(/_/g, ' ')}</span>
                      <span className="px-4 py-2.5 text-warm-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share — mobile */}
            <div className="md:hidden">
              <h3 className="text-sm font-semibold text-warm-700 mb-3">Share This Product</h3>
              <div className="flex gap-2">
                <a href={waShare} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#25D366' }}>
                  WhatsApp
                </a>
                <button onClick={copy}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-beige-400 text-warm-700'}`}>
                  {copied ? '✓ Copied' : '🔗 Copy'}
                </button>
                {typeof navigator.share === 'function' && (
                  <button onClick={() => navigator.share({ title: product.product_name, url: shareUrl }).catch(() => {})}
                    className="p-2.5 border-2 border-beige-400 rounded-xl text-warm-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
