import React, { useContext, useRef, useState, useEffect } from 'react';
import { useParams, Link }  from 'react-router-dom';
import { MdVerified }       from 'react-icons/md';
import { FaExclamationCircle, FaImage, FaInstagram, FaSpinner, FaTwitter, FaGlobe, FaYoutube, FaStore } from 'react-icons/fa';
import api                  from '../services/api';
import { AuthContext }      from '../context/AuthContext';
import ProductCard          from '../components/ProductCard';
import SellerBadge          from '../components/SellerBadge';
import StarRating           from '../components/StarRating';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';

const getComparableId = (value) => {
  if (!value) return '';
  return String(value._id || value.id || value).trim();
};

const StorePage = () => {
  const { username }       = useParams();
  const { user }           = useContext(AuthContext);
  const bannerInputRef     = useRef(null);
  const [seller,   setSeller]   = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerInfoOpen, setBannerInfoOpen] = useState(false);

  useEffect(() => {
    api.get(`/seller/store/${username}`)
      .then(({ data }) => {
        setSeller(data.seller);
        setSettings(data.settings);
        setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!seller) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
      <FaStore size={48} className="opacity-30" />
      <p className="text-lg font-medium">Store not found</p>
      <Link to="/marketplace" className="text-violet-600 hover:underline text-sm">Browse Marketplace</Link>
    </div>
  );

  const rawSocial = settings?.socialLinks || {};
  const social = {
    instagram: getSafeHttpUrl(rawSocial.instagram, { allowBareDomain: true }),
    twitter: getSafeHttpUrl(rawSocial.twitter, { allowBareDomain: true }),
    website: getSafeHttpUrl(rawSocial.website, { allowBareDomain: true }),
    youtube: getSafeHttpUrl(rawSocial.youtube, { allowBareDomain: true }),
  };
  const safeBannerImage = getSafeImageUrl(settings?.bannerImage);
  const safeSellerProfileImage = getSafeImageUrl(seller.profileImage);
  const bannerBackgroundStyle = safeBannerImage ? {
    backgroundImage: `url("${safeBannerImage}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};
  const featured = settings?.featuredProducts || [];
  const nonFeatured = products.filter(p => !featured.some(f => (f._id || f) === p._id));
  const totalSales  = products.reduce((s, p) => s + (p.stats?.sales || 0), 0);
  const userId = getComparableId(user);
  const sellerId = getComparableId(seller);
  const isStoreOwner = Boolean(
    user && seller && (
      (userId && sellerId && userId === sellerId) ||
      (user.username && seller.username && user.username === seller.username)
    )
  );

  const handleBannerFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBannerMessage('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBannerMessage('Banner image must be 5 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('banner', file);
    setBannerUploading(true);
    setBannerMessage('');

    try {
      const { data } = await api.put('/seller/store/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSettings(data.settings);
      setBannerMessage('Store banner updated.');
    } catch (error) {
      setBannerMessage(error.response?.data?.message || 'Could not upload the banner.');
    } finally {
      setBannerUploading(false);
    }
  };

  return (
    <div className="lekhon-store-page min-h-screen bg-[var(--bg-primary)]">
      {/* ── Banner ────────────────────────────────────────────────────────────── */}
      <div
        className="lekhon-store-hero relative h-40 sm:h-56 w-full bg-gradient-to-br from-emerald-900 to-amber-700 overflow-hidden"
        style={bannerBackgroundStyle}
      >
        <div className="absolute inset-0 bg-black/30" />
        {isStoreOwner && (
          <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
            <div className="flex items-center gap-2">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerFile}
              />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerUploading}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-black/45 px-4 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {bannerUploading ? <FaSpinner className="animate-spin" /> : <FaImage />}
                {safeBannerImage ? 'Change banner' : 'Add banner'}
              </button>
              <button
                type="button"
                onClick={() => setBannerInfoOpen(open => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/60"
                aria-expanded={bannerInfoOpen}
                aria-label="Store banner image guide"
              >
                <FaExclamationCircle />
              </button>
            </div>
            {bannerInfoOpen && (
              <div className="w-[min(88vw,330px)] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left text-xs text-[var(--text-secondary)] shadow-2xl">
                <p className="text-sm font-bold text-[var(--text-primary)]">Store banner guide</p>
                <ul className="mt-2 space-y-1.5">
                  <li>Recommended size: 1400 x 420 px or wider 10:3 ratio.</li>
                  <li>Use JPG, PNG, or WebP under 5 MB.</li>
                  <li>Best for brand visuals, seasonal offers, featured categories, launch messages, or sale campaigns.</li>
                  <li>Keep important text near the center because edges crop on small screens.</li>
                </ul>
              </div>
            )}
            {bannerMessage && (
              <p className="max-w-[280px] rounded-full bg-black/55 px-3 py-1.5 text-right text-xs font-semibold text-white shadow-lg backdrop-blur">
                {bannerMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Seller info ──────────────────────────────────────────────────────── */}
      <div className="lekhon-store-shell max-w-5xl mx-auto px-4">
        <div className="lekhon-store-profile relative -mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4 pb-5 border-b border-[var(--border-color)]">
          <img
            src={safeSellerProfileImage || ''}
            alt={seller.name}
            className="w-24 h-24 rounded-2xl object-cover border-4 border-[var(--bg-primary)] bg-[var(--bg-secondary)] shadow-lg"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {settings?.storeName || seller.name}
              </h1>
              {seller.isVerified && <MdVerified size={18} className="text-blue-500" />}
              <SellerBadge size="sm" withLabel />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">@{seller.username}</p>
            {settings?.bio && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-lg">{settings.bio}</p>
            )}
          </div>

          {/* Stats pills */}
          <div className="flex gap-3 shrink-0">
            {[
              { label: 'Products', value: products.length },
              { label: 'Sales',    value: totalSales },
              { label: 'Rating',   value: settings?.stats?.averageRating > 0 ? `${settings.stats.averageRating}★` : '—' },
            ].map(s => (
              <div key={s.label} className="text-center px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <p className="font-bold text-[var(--text-primary)] text-sm">{s.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Social links ──────────────────────────────────────────────────────── */}
        {(social.instagram || social.twitter || social.website || social.youtube) && (
          <div className="flex gap-3 py-4 border-b border-[var(--border-color)]">
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-pink-500 transition-colors"><FaInstagram size={18} /></a>}
            {social.twitter   && <a href={social.twitter}   target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-sky-400   transition-colors"><FaTwitter  size={18} /></a>}
            {social.youtube   && <a href={social.youtube}   target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-red-500   transition-colors"><FaYoutube  size={18} /></a>}
            {social.website   && <a href={social.website}   target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-violet-500 transition-colors"><FaGlobe    size={18} /></a>}
          </div>
        )}

        {/* ── Featured products ────────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <div className="py-6">
            <h2 className="font-bold text-[var(--text-primary)] mb-4">⭐ Featured</h2>
            <div className="lekhon-market-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {featured.map(p => (
                <ProductCard key={p._id || p} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* ── All products ─────────────────────────────────────────────────────── */}
        <div className="py-6">
          <h2 className="font-bold text-[var(--text-primary)] mb-4">
            All Products <span className="text-[var(--text-muted)] font-normal">({products.length})</span>
          </h2>
          {products.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <FaStore size={40} className="mx-auto mb-3 opacity-30" />
              <p>No products listed yet.</p>
            </div>
          ) : (
            <div className="lekhon-market-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
