import React, { useState, useEffect } from 'react';
import { useParams, Link }  from 'react-router-dom';
import { MdVerified }       from 'react-icons/md';
import { FaInstagram, FaTwitter, FaGlobe, FaYoutube, FaStore } from 'react-icons/fa';
import api                  from '../services/api';
import ProductCard          from '../components/ProductCard';
import SellerBadge          from '../components/SellerBadge';
import StarRating           from '../components/StarRating';

const StorePage = () => {
  const { username }       = useParams();
  const [seller,   setSeller]   = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

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

  const social = settings?.socialLinks || {};
  const featured = settings?.featuredProducts || [];
  const nonFeatured = products.filter(p => !featured.some(f => (f._id || f) === p._id));
  const totalSales  = products.reduce((s, p) => s + (p.stats?.sales || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Banner ────────────────────────────────────────────────────────────── */}
      <div
        className="relative h-40 sm:h-56 w-full bg-gradient-to-br from-violet-600 to-indigo-700 overflow-hidden"
        style={settings?.bannerImage ? {
          backgroundImage: `url(${settings.bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* ── Seller info ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4 pb-5 border-b border-[var(--border-color)]">
          <img
            src={seller.profileImage || ''}
            alt={seller.name}
            className="w-24 h-24 rounded-2xl object-cover border-4 border-[var(--bg-primary)] bg-[var(--bg-secondary)] shadow-lg"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
