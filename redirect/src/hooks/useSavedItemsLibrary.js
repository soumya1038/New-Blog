import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  getSavedUserKey,
  readSavedContentRecords,
} from '../utils/savedItemsStorage';

const getArray = (value) => (Array.isArray(value) ? value : []);

const getProductSource = (item = {}) => item.product || item.productId || item;

const getProductId = (item = {}) => String(item?._id || item?.id || '');

const getContentId = (item = {}) => String(item?._id || item?.id || item?.slug || '');

const getContentPath = (type, item = {}, fallbackId = '') => {
  const id = item.slug || item._id || item.id || fallbackId;
  if (type === 'article') return `/article/${id}`;
  if (type === 'short') return `/shorts/${item._id || item.id || id}`;
  return `/blog/${id}`;
};

const getImage = (item = {}) =>
  item.thumbnail ||
  item.coverImage ||
  item.featuredImage ||
  item.image ||
  item.transparentThumbnail ||
  '';

const formatPrice = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '';
  return `Rs. ${number.toLocaleString('en-IN')}`;
};

const normalizeProduct = (item = {}) => {
  const product = getProductSource(item);
  const id = getProductId(product);
  if (!id) return null;

  return {
    id,
    key: `product-${id}`,
    type: 'product',
    title: product.title || 'Saved product',
    image: getImage(product),
    eyebrow: 'Product',
    subtitle: product.type || 'Marketplace',
    meta: product.isFree ? 'Free' : formatPrice(product.price),
    path: `/marketplace/${product.slug || id}`,
  };
};

const normalizeContent = (record, source = {}) => {
  const id = getContentId(source) || record.id;
  if (!id) return null;

  const typeLabel = record.type === 'short' ? 'Short' : record.type === 'article' ? 'Article' : 'Blog';
  const meta = record.meta || {};

  return {
    id,
    key: `${record.type}-${record.id}`,
    type: record.type,
    title: source.title || meta.title || `Saved ${typeLabel.toLowerCase()}`,
    image: getImage(source) || meta.image || '',
    eyebrow: typeLabel,
    subtitle: source.author?.username || source.author?.fullName || meta.subtitle || 'Saved read',
    meta: meta.savedAt ? new Date(meta.savedAt).toLocaleDateString() : '',
    path: meta.path || getContentPath(record.type, source, record.id),
  };
};

const getEndpoint = (type, id) => {
  if (type === 'article') return `/articles/${id}`;
  if (type === 'short') return `/shorts/${id}`;
  return `/blogs/${id}`;
};

const getResponseItem = (type, data = {}) => {
  if (type === 'article') return data.article || data;
  if (type === 'short') return data.short || data.blog || data;
  return data.blog || data;
};

const buildSourceMap = ({ articles = [], blogs = [], shorts = [] }) => {
  const map = new Map();
  [
    ['article', articles],
    ['blog', blogs],
    ['short', shorts],
  ].forEach(([type, items]) => {
    getArray(items).forEach((item) => {
      [item?._id, item?.id, item?.slug].filter(Boolean).forEach((id) => {
        map.set(`${type}:${id}`, item);
      });
    });
  });
  return map;
};

const useSavedItemsLibrary = ({
  user,
  wishlist = [],
  articles = [],
  blogs = [],
  shorts = [],
} = {}) => {
  const userKey = getSavedUserKey(user);
  const [localVersion, setLocalVersion] = useState(0);
  const [contentItems, setContentItems] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    const refresh = () => setLocalVersion((version) => version + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('lekhon:saved-items-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('lekhon:saved-items-updated', refresh);
    };
  }, []);

  const products = useMemo(
    () => getArray(wishlist).map(normalizeProduct).filter(Boolean),
    [wishlist]
  );

  const sourceMap = useMemo(
    () => buildSourceMap({ articles, blogs, shorts }),
    [articles, blogs, shorts]
  );

  const localRecords = useMemo(
    () => readSavedContentRecords(userKey),
    [userKey, localVersion]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (localRecords.length === 0) {
        setContentItems([]);
        setContentLoading(false);
        return;
      }

      setContentLoading(true);

      const immediate = localRecords.map((record) => {
        const source = sourceMap.get(`${record.type}:${record.id}`);
        if (source) return normalizeContent(record, source);
        if (record.meta?.title) return normalizeContent(record, {});
        return null;
      });

      const missing = localRecords.filter((record, index) => !immediate[index]).slice(0, 30);
      const fetched = await Promise.allSettled(
        missing.map(async (record) => {
          const { data } = await api.get(getEndpoint(record.type, record.id));
          return normalizeContent(record, getResponseItem(record.type, data));
        })
      );

      if (cancelled) return;

      const fetchedMap = new Map();
      fetched.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          fetchedMap.set(`${missing[index].type}:${missing[index].id}`, result.value);
        }
      });

      setContentItems(
        localRecords
          .map((record, index) => immediate[index] || fetchedMap.get(`${record.type}:${record.id}`))
          .filter(Boolean)
      );
      setContentLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [localRecords, sourceMap]);

  const itemsByType = useMemo(() => ({
    products,
    articles: contentItems.filter((item) => item.type === 'article'),
    blogs: contentItems.filter((item) => item.type === 'blog'),
    shorts: contentItems.filter((item) => item.type === 'short'),
  }), [contentItems, products]);

  const summary = useMemo(() => ({
    products: itemsByType.products.length,
    articles: itemsByType.articles.length,
    blogs: itemsByType.blogs.length,
    shorts: itemsByType.shorts.length,
    content: contentItems.length,
    total: products.length + contentItems.length,
  }), [contentItems.length, itemsByType, products.length]);

  return {
    itemsByType,
    summary,
    loading: contentLoading,
  };
};

export default useSavedItemsLibrary;
