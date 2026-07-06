import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const emptyProfile = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  bio: '',
  socialMedia: [],
};

const getArray = (value) => (Array.isArray(value) ? value : []);

const getContentDate = (item = {}) =>
  new Date(item.updatedAt || item.createdAt || item.publishedAt || 0).getTime();

const normalizeContent = (items, type) =>
  getArray(items).map((item) => ({
    ...item,
    contentType: type,
  }));

const getPublishedItems = (items) => getArray(items).filter((item) => !item?.isDraft);

const getDraftItems = (items) => getArray(items).filter((item) => item?.isDraft);

const getWishlistItems = (data = {}) => getArray(data.products || data.items || data.wishlist);

const getOrders = (data = {}) => getArray(data.orders);

const getTotal = (data = {}, fallback = 0) => {
  const total = Number(data.total ?? data.count ?? data.pagination?.total ?? fallback);
  return Number.isFinite(total) ? total : fallback;
};

export const formatCompactCount = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
};

const useCurrentProfileSummary = () => {
  const { user, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(emptyProfile);
  const [blogs, setBlogs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [draftCount, setDraftCount] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistTotal, setWishlistTotal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderTotal, setOrderTotal] = useState(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfileSummary = useCallback(async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [
        profileRes,
        blogsRes,
        articlesRes,
        shortsRes,
        draftsRes,
        wishlistRes,
        ordersRes,
        twoFactorRes,
      ] = await Promise.allSettled([
        api.get('/users/profile'),
        api.get(`/blogs?author=${user._id}`),
        api.get(`/articles?author=${user._id}`),
        api.get(`/shorts?author=${user._id}`),
        api.get('/drafts/summary'),
        api.get('/marketplace/wishlist'),
        api.get('/orders?limit=1'),
        api.get('/users/2fa/status'),
      ]);

      if (profileRes.status === 'fulfilled') {
        const nextProfile = profileRes.value.data?.user || emptyProfile;
        setProfile(nextProfile);
        setUser((currentUser) => (
          currentUser?._id === nextProfile?._id
            ? { ...currentUser, ...nextProfile }
            : currentUser || nextProfile
        ));
      }

      if (blogsRes.status === 'fulfilled') setBlogs(getArray(blogsRes.value.data?.blogs));
      if (articlesRes.status === 'fulfilled') setArticles(getArray(articlesRes.value.data?.articles));
      if (shortsRes.status === 'fulfilled') setShorts(getArray(shortsRes.value.data?.shorts));
      if (draftsRes.status === 'fulfilled') setDraftCount(getTotal(draftsRes.value.data));
      if (wishlistRes.status === 'fulfilled') {
        const nextWishlist = getWishlistItems(wishlistRes.value.data);
        setWishlist(nextWishlist);
        setWishlistTotal(getTotal(wishlistRes.value.data, nextWishlist.length));
      }
      if (ordersRes.status === 'fulfilled') {
        const nextOrders = getOrders(ordersRes.value.data);
        setOrders(nextOrders);
        setOrderTotal(getTotal(ordersRes.value.data, nextOrders.length));
      }
      if (twoFactorRes.status === 'fulfilled') setTwoFactorStatus(twoFactorRes.value.data?.twoFactor || null);

      if (profileRes.status === 'rejected') {
        setError(profileRes.reason?.response?.data?.message || 'Unable to load profile.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }, [setUser, user?._id]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      await loadProfileSummary();
      if (!isMounted) return;
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [loadProfileSummary]);

  const updateProfile = useCallback(async (updates) => {
    const payload = { ...profile, ...updates };
    const { data } = await api.put('/users/profile', payload);
    const nextProfile = data?.user || payload;
    setProfile(nextProfile);
    setUser((currentUser) => (
      currentUser?._id === nextProfile?._id
        ? { ...currentUser, ...nextProfile }
        : currentUser || nextProfile
    ));
    return nextProfile;
  }, [profile, setUser]);

  const displayUser = useMemo(
    () => ({ ...(user || {}), ...(profile || {}) }),
    [profile, user]
  );

  const publishedBlogs = useMemo(() => getPublishedItems(blogs), [blogs]);
  const publishedArticles = useMemo(() => getPublishedItems(articles), [articles]);
  const publishedShorts = useMemo(() => getPublishedItems(shorts), [shorts]);

  const allContent = useMemo(
    () => [
      ...normalizeContent(articles, 'article'),
      ...normalizeContent(blogs, 'blog'),
      ...normalizeContent(shorts, 'short'),
    ].sort((a, b) => getContentDate(b) - getContentDate(a)),
    [articles, blogs, shorts]
  );

  const publishedContent = useMemo(
    () => allContent.filter((item) => !item?.isDraft),
    [allContent]
  );

  const contentDrafts = useMemo(
    () => [
      ...getDraftItems(articles),
      ...getDraftItems(blogs),
      ...getDraftItems(shorts),
    ],
    [articles, blogs, shorts]
  );

  const stats = useMemo(() => ({
    posts: publishedBlogs.length + publishedArticles.length + publishedShorts.length,
    blogs: publishedBlogs.length,
    articles: publishedArticles.length,
    shorts: publishedShorts.length,
    drafts: draftCount ?? contentDrafts.length,
    saved: wishlistTotal ?? wishlist.length,
    orders: orderTotal ?? orders.length,
    followers: displayUser?.followerCount ?? getArray(displayUser?.followers).length,
    following: displayUser?.followingCount ?? getArray(displayUser?.following).length,
  }), [
    contentDrafts.length,
    displayUser?.followerCount,
    displayUser?.followers,
    displayUser?.following,
    displayUser?.followingCount,
    draftCount,
    orders.length,
    orderTotal,
    publishedArticles.length,
    publishedBlogs.length,
    publishedShorts.length,
    wishlist.length,
    wishlistTotal,
  ]);

  return {
    user,
    profile,
    displayUser,
    blogs,
    articles,
    shorts,
    drafts: contentDrafts,
    wishlist,
    orders,
    allContent,
    publishedContent,
    stats,
    twoFactorStatus,
    loading,
    error,
    reload: loadProfileSummary,
    updateProfile,
  };
};

export default useCurrentProfileSummary;
