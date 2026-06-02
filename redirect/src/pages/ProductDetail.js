import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import StarRating   from '../components/StarRating';
import SellerBadge  from '../components/SellerBadge';
import CartDrawer   from '../components/CartDrawer';
import { MdVerified } from 'react-icons/md';
import {
  FaShoppingCart, FaBolt, FaHeart, FaRegHeart,
  FaShareAlt, FaExternalLinkAlt, FaDownload,
  FaChevronDown, FaChevronUp, FaWhatsapp,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { BarLoader } from 'react-spinners';

const ProductDetail = () => {
  const { slug }  = useParams();
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();

  const [product,   setProduct]   = useState(null);
  const [reviews,   setReviews]   = useState([]);
  const [related,   setRelated]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [cartAdding,setCartAdding]= useState(false);
  const [wishlisted,setWishlisted]= useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/marketplace/${slug}`)
      .then(({ data }) => {
        setProduct(data.product);
        setReviews(data.reviews || []);
        setRelated(data.related || []);
      })
      .catch(() => navigate('/marketplace'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  const addToCart = async () => {
    if (!user) return navigate('/login');
    setCartAdding(true);
    try {
      await api.post('/marketplace/cart/add', { productId: product._id, qty: 1 });
      window.dispatchEvent(new Event('cartUpdated'));
      setCartOpen(true);
    } catch {}
    setCartAdding(false);
  };

  const toggleWishlist = async () => {
    if (!user) return navigate('/login');
    try {
      const { data } = await api.post(`/marketplace/wishlist/${product._id}`);
      setWishlisted(data.added);
    } catch {}
  };

  const handleExternalClick = async () => {
    await api.post(`/marketplace/${product._id}/click`).catch(() => {});
    window.open(product.external.url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen"><BarLoader width="100%" color="#7c3aed" /></div>;
  if (!product) return null;

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const seller = product.sellerId;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="text-xs text-[var(--text-muted)] mb-5 flex items-center gap-1.5">
          <Link to="/marketplace" className="hover:text-violet-500">Marketplace</Link>
          <span>/</span>
          {product.category?.[0] && <><span>{product.category[0]}</span><span>/</span></>}
          <span className="text-[var(--text-secondary)] truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* ── Images ──────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              {product.images?.[activeImg] ? (
                <img src={product.images[activeImg]} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🛍️</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activeImg === i ? 'border-violet-500' : 'border-[var(--border-color)]'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.decoration?.badges?.map(b => (
                <span key={b} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{b}</span>
              ))}
              {product.type === 'digital' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">💾 Digital Download</span>}
              {product.type === 'service' && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">🛠 Service</span>}
            </div>

            {/* Promo banner */}
            {product.decoration?.promoBanner && (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium">
                {product.decoration.promoBanner}
              </div>
            )}

            <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-snug">{product.title}</h1>

            {/* Rating */}
            {product.reviewCount > 0 && (
              <StarRating value={product.averageRating} count={product.reviewCount} size={14} />
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {product.isFree ? (
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">Free</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-[var(--text-primary)]">₹{product.price.toLocaleString('en-IN')}</span>
                  {product.compareAtPrice > product.price && (
                    <>
                      <span className="text-lg text-[var(--text-muted)] line-through">₹{product.compareAtPrice.toLocaleString('en-IN')}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">{discount}% off</span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Type-specific info */}
            {product.type === 'digital' && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Format',    value: product.digital?.fileFormat?.toUpperCase() || '—' },
                  { label: 'Downloads', value: `Up to ${product.digital?.maxDownloads || 5}` },
                  { label: 'Delivery',  value: 'Instant' },
                ].map(item => (
                  <div key={item.label} className="py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
            {product.type === 'service' && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Delivery',  value: `${product.service?.deliveryDays || 3} days` },
                  { label: 'Revisions', value: product.service?.revisions || 1 },
                  { label: 'Response',  value: 'Within 24h' },
                ].map(item => (
                  <div key={item.label} className="py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
            {product.type === 'physical' && (
              <div className="text-sm text-[var(--text-secondary)] space-y-1">
                <p>📦 Estimated delivery: <strong>{product.physical?.estimatedDeliveryDays || 7} days</strong></p>
                <p>🚚 Shipping: <strong>{product.physical?.shippingFee > 0 ? `₹${product.physical.shippingFee}` : 'Free'}</strong></p>
                {product.physical?.stock < 10 && product.physical?.stock > 0 && (
                  <p className="text-amber-600 dark:text-amber-400">⚠️ Only {product.physical.stock} left in stock!</p>
                )}
              </div>
            )}

            {/* CTA buttons */}
            {product.type === 'external' ? (
              <button
                onClick={handleExternalClick}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
              >
                <FaExternalLinkAlt size={13} />
                Buy on {product.external?.platform || 'External Store'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={addToCart}
                  disabled={cartAdding}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-violet-500 text-violet-600 dark:text-violet-400 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-60"
                >
                  <FaShoppingCart size={14} />
                  {cartAdding ? 'Adding…' : 'Add to Cart'}
                </button>
                <button
                  onClick={() => { addToCart(); navigate('/checkout'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
                >
                  <FaBolt size={12} />
                  Buy Now
                </button>
              </div>
            )}

            {/* Secondary actions */}
            <div className="flex gap-2">
              <button onClick={toggleWishlist} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-red-500 hover:border-red-300 transition-colors">
                {wishlisted ? <FaHeart size={12} className="text-red-500" /> : <FaRegHeart size={12} />}
                {wishlisted ? 'Saved' : 'Save'}
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-violet-500 hover:border-violet-300 transition-colors"
                  title="Copy link"
                >
                  <FaShareAlt size={11} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${product.title} - Rs. ${product.price} | ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-green-600 dark:text-green-400 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  title="Share on WhatsApp"
                >
                  <FaWhatsapp size={12} />
                  WA
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${product.title} - Check it out on Lekhon`)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-[var(--border-color)] text-xs text-sky-500 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                  title="Share on Twitter/X"
                >
                  <FaXTwitter size={11} />
                  X
                </a>
              </div>
            </div>

            {/* Seller card */}
            {seller && (
              <Link to={`/store/${seller.username}`} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-violet-400 transition-colors mt-1">
                <img src={seller.profileImage || ''} alt="" className="w-10 h-10 rounded-full object-cover bg-[var(--bg-secondary)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{seller.name || seller.username}</span>
                    {seller.isVerified && <MdVerified size={14} className="text-blue-500 shrink-0" />}
                    <SellerBadge size="xs" withLabel />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">View Store →</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────────────────── */}
        {product.description && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Description</h2>
            <div
              className="prose prose-sm max-w-none text-[var(--text-secondary)] dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}

        {/* ── Service includes/excludes ────────────────────────────────────────── */}
        {product.type === 'service' && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {product.service?.includes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900">
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2 text-sm">✅ What's included</h3>
                <ul className="space-y-1">
                  {product.service.includes.map((item, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.service?.excludes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
                <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2 text-sm">❌ Not included</h3>
                <ul className="space-y-1">
                  {product.service.excludes.map((item, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── FAQs ────────────────────────────────────────────────────────────── */}
        {product.decoration?.faqs?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">FAQ</h2>
            <div className="space-y-2">
              {product.decoration.faqs.map((faq, i) => (
                <div key={i} className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                  <button
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  >
                    {faq.question}
                    {activeFaq === i ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>
                  {activeFaq === i && (
                    <div className="px-4 pb-3 text-sm text-[var(--text-secondary)]">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reviews ─────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            Reviews {product.reviewCount > 0 && <span className="text-[var(--text-muted)] font-normal text-base">({product.reviewCount})</span>}
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No reviews yet. Be the first to review after purchase.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r._id} className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={r.buyerId?.profileImage || ''} alt="" className="w-8 h-8 rounded-full object-cover bg-[var(--bg-secondary)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{r.buyerId?.name || r.buyerId?.username}</p>
                      <StarRating value={r.rating} size={11} />
                    </div>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{r.title}</p>}
                  {r.body  && <p className="text-sm text-[var(--text-secondary)]">{r.body}</p>}
                  {r.sellerReply && (
                    <div className="mt-3 pl-3 border-l-2 border-violet-400">
                      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-0.5">Seller replied:</p>
                      <p className="text-xs text-[var(--text-secondary)]">{r.sellerReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Related ─────────────────────────────────────────────────────────── */}
        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">You may also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {related.map(p => (
                <Link key={p._id} to={`/marketplace/${p.slug}`} className="group text-center">
                  <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)] mb-1.5 border border-[var(--border-color)] group-hover:border-violet-400 transition-colors">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>}
                  </div>
                  <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{p.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">₹{p.price?.toLocaleString('en-IN')}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default ProductDetail;
