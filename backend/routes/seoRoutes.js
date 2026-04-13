const express = require('express');
const Blog = require('../models/Blog');
const Article = require('../models/Article');

const router = express.Router();

const MAX_FEED_ITEMS = 50;
const MAX_SITEMAP_ITEMS = 5000;

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
  return `${compact.slice(0, max - 1).trim()}…`;
};

const resolvePublicBaseUrl = (req) => {
  const fromEnv = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
};

const buildContentUrl = (baseUrl, type, id) => `${baseUrl}/${type}/${id}`;

router.get('/robots.txt', (req, res) => {
  const baseUrl = resolvePublicBaseUrl(req);
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

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = resolvePublicBaseUrl(req);

    const [blogs, articles] = await Promise.all([
      Blog.find({ isDraft: false })
        .select('_id updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(MAX_SITEMAP_ITEMS),
      Article.find({ isDraft: false })
        .select('_id updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .limit(MAX_SITEMAP_ITEMS)
    ]);

    const urls = [
      {
        loc: `${baseUrl}/`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      },
      ...blogs.map((item) => ({
        loc: buildContentUrl(baseUrl, 'blog', item._id),
        lastmod: new Date(item.updatedAt || item.createdAt || Date.now()).toISOString(),
        changefreq: 'weekly',
        priority: '0.8'
      })),
      ...articles.map((item) => ({
        loc: buildContentUrl(baseUrl, 'article', item._id),
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

    res.type('application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate sitemap' });
  }
});

router.get('/feed.xml', async (req, res) => {
  try {
    const baseUrl = resolvePublicBaseUrl(req);

    const [blogs, articles] = await Promise.all([
      Blog.find({ isDraft: false })
        .select('_id title content metaDescription createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(MAX_FEED_ITEMS),
      Article.find({ isDraft: false })
        .select('_id title content metaDescription createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(MAX_FEED_ITEMS)
    ]);

    const items = [
      ...blogs.map((item) => ({
        type: 'blog',
        id: item._id,
        title: item.title,
        description: item.metaDescription || toExcerpt(item.content),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      ...articles.map((item) => ({
        type: 'article',
        id: item._id,
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

    res.type('application/rss+xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate feed' });
  }
});

module.exports = router;
