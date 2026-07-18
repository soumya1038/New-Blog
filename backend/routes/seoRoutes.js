const express = require('express');
const rateLimit = require('express-rate-limit');
const Blog = require('../models/Blog');
const Article = require('../models/Article');
const { parsePositiveInt, getCache, setCache } = require('../utils/cacheStore');
const { createRedisRateLimitStore } = require('../utils/redisRateLimitStore');

const router = express.Router();

const MAX_FEED_ITEMS = Math.min(parsePositiveInt(process.env.SEO_MAX_FEED_ITEMS, 50), 100);
const MAX_SITEMAP_ITEMS = Math.min(parsePositiveInt(process.env.SEO_MAX_SITEMAP_ITEMS, 5000), 5000);
const SEO_CACHE_TTL_SECONDS = parsePositiveInt(process.env.CACHE_TTL_SEO_SECONDS, 600);
const SEO_QUERY_MAX_TIME_MS = parsePositiveInt(process.env.SEO_QUERY_MAX_TIME_MS, 5000);
const SEO_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.SEO_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const SEO_RATE_LIMIT_MAX = parsePositiveInt(process.env.SEO_RATE_LIMIT_MAX, 120);

const seoRateLimitStore = createRedisRateLimitStore({
  prefix: 'seo',
  windowMs: SEO_RATE_LIMIT_WINDOW_MS,
});
const seoRateLimitFailOpen =
  process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_FAIL_OPEN === 'true';

const getRetryAfterSeconds = (req, fallbackMs) => {
  const resetTime = req.rateLimit?.resetTime;
  const resetMs = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  const resetSeconds = Number.isFinite(resetMs) ? Math.ceil((resetMs - Date.now()) / 1000) : 0;
  return Math.max(1, resetSeconds || Math.ceil(fallbackMs / 1000));
};

const seoLimiter = rateLimit({
  windowMs: SEO_RATE_LIMIT_WINDOW_MS,
  max: SEO_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: Boolean(seoRateLimitStore) && seoRateLimitFailOpen,
  ...(seoRateLimitStore ? { store: seoRateLimitStore } : {}),
  handler: (req, res) => {
    res.set('Retry-After', String(getRetryAfterSeconds(req, SEO_RATE_LIMIT_WINDOW_MS)));
    return res.status(429).type('text/plain').send('Too many SEO requests. Please retry later.');
  },
});

const xmlEscape = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const stripMarkdown = (value = '') =>
  String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toExcerpt = (text = '', max = 220) => {
  const compact = stripMarkdown(text);
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 3).trim()}...`;
};

const isProductionRuntime = () => process.env.NODE_ENV === 'production';

const normalizeBaseUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch (error) {
    return '';
  }
};

const resolvePublicBaseUrl = (req) => {
  const fromEnv = normalizeBaseUrl(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL);
  if (fromEnv) return fromEnv;
  if (isProductionRuntime()) return '';
  return normalizeBaseUrl(`${req.protocol}://${req.get('host')}`);
};

const buildContentUrl = (baseUrl, type, id) => `${baseUrl}/${type}/${id}`;

router.get('/robots.txt', seoLimiter, (req, res) => {
  const baseUrl = resolvePublicBaseUrl(req);
  if (!baseUrl) {
    return res.status(503).type('text/plain').send('SEO base URL is not configured.');
  }
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join('\n');

  res.type('text/plain');
  res.send(body);
});

router.get('/sitemap.xml', seoLimiter, async (req, res) => {
  try {
    const baseUrl = resolvePublicBaseUrl(req);
    if (!baseUrl) {
      return res.status(503).type('text/plain').send('SEO base URL is not configured.');
    }
    const cacheKey = `seo:sitemap:${baseUrl}`;
    const cachedSitemap = await getCache(cacheKey);
    if (cachedSitemap) {
      res.type('application/xml');
      return res.send(cachedSitemap);
    }

    const [blogs, articles] = await Promise.all([
      Blog.find({ isDraft: false })
        .select('_id slug updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(MAX_SITEMAP_ITEMS)
        .maxTimeMS(SEO_QUERY_MAX_TIME_MS)
        .lean(),
      Article.find({ isDraft: false })
        .select('_id slug updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(MAX_SITEMAP_ITEMS)
        .maxTimeMS(SEO_QUERY_MAX_TIME_MS)
        .lean()
    ]);

    const urls = [
      {
        loc: `${baseUrl}/`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      },
      ...blogs.map((item) => ({
        loc: buildContentUrl(baseUrl, 'blog', item.slug || item._id),
        lastmod: new Date(item.updatedAt || item.createdAt || Date.now()).toISOString(),
        changefreq: 'weekly',
        priority: '0.8'
      })),
      ...articles.map((item) => ({
        loc: buildContentUrl(baseUrl, 'article', item.slug || item._id),
        lastmod: new Date(item.updatedAt || item.createdAt || Date.now()).toISOString(),
        changefreq: 'weekly',
        priority: '0.8'
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>
    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>
    <priority>${xmlEscape(entry.priority)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    await setCache(cacheKey, xml, SEO_CACHE_TTL_SECONDS);

    res.type('application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate sitemap' });
  }
});

router.get('/feed.xml', seoLimiter, async (req, res) => {
  try {
    const baseUrl = resolvePublicBaseUrl(req);
    if (!baseUrl) {
      return res.status(503).type('text/plain').send('SEO base URL is not configured.');
    }
    const cacheKey = `seo:feed:${baseUrl}`;
    const cachedFeed = await getCache(cacheKey);
    if (cachedFeed) {
      res.type('application/rss+xml');
      return res.send(cachedFeed);
    }

    const [blogs, articles] = await Promise.all([
      Blog.find({ isDraft: false })
        .select('_id slug title content metaDescription createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(MAX_FEED_ITEMS)
        .maxTimeMS(SEO_QUERY_MAX_TIME_MS)
        .lean(),
      Article.find({ isDraft: false })
        .select('_id slug title content metaDescription createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(MAX_FEED_ITEMS)
        .maxTimeMS(SEO_QUERY_MAX_TIME_MS)
        .lean()
    ]);

    const items = [
      ...blogs.map((item) => ({
        type: 'blog',
        id: item.slug || item._id,
        title: item.title,
        description: item.metaDescription || toExcerpt(item.content),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      ...articles.map((item) => ({
        type: 'article',
        id: item.slug || item._id,
        title: item.title,
        description: item.metaDescription || toExcerpt(item.content),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, MAX_FEED_ITEMS);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape('Lekhon Feed')}</title>
    <link>${xmlEscape(baseUrl)}</link>
    <description>${xmlEscape('Latest posts and articles from Lekhon')}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map((entry) => {
    const link = buildContentUrl(baseUrl, entry.type, entry.id);
    return `    <item>
      <title>${xmlEscape(entry.title || `${entry.type} update`)}</title>
      <link>${xmlEscape(link)}</link>
      <guid>${xmlEscape(link)}</guid>
      <pubDate>${new Date(entry.createdAt || entry.updatedAt || Date.now()).toUTCString()}</pubDate>
      <description>${xmlEscape(entry.description || 'Read the full post on Lekhon.')}</description>
    </item>`;
  })
  .join('\n')}
  </channel>
</rss>`;

    await setCache(cacheKey, xml, SEO_CACHE_TTL_SECONDS);

    res.type('application/rss+xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate feed' });
  }
});

module.exports = router;


