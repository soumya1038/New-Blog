const express = require('express');
const axios = require('axios');
const {
  createRedisBackedRateLimiter,
  toPositiveInt,
} = require('../utils/rateLimiterFactory');

const router = express.Router();

const NEWS_CATEGORIES = new Set([
  'All',
  'India',
  'World',
  'Business',
  'Sports',
  'Technology',
  'Entertainment',
  'Health',
  'Esports',
]);

const DEFAULT_NEWS_LIMIT = 36;
const MAX_NEWS_LIMIT = 50;
const MAX_CACHE_ENTRIES = 250;

const cache = new Map();

const toBoundedPositiveInt = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const providerTimeoutMs = toBoundedPositiveInt(process.env.WIDGET_PROVIDER_TIMEOUT_MS, 5000, 100, 30000);
const newsCacheTtlMs = toBoundedPositiveInt(process.env.NEWS_WIDGET_CACHE_TTL_SECONDS, 300, 30, 3600) * 1000;
const weatherCacheTtlMs = toBoundedPositiveInt(process.env.WEATHER_WIDGET_CACHE_TTL_SECONDS, 300, 30, 3600) * 1000;
const cricketCacheTtlMs = toBoundedPositiveInt(process.env.CRICKET_WIDGET_CACHE_TTL_SECONDS, 120, 30, 3600) * 1000;

const widgetLimiter = createRedisBackedRateLimiter({
  windowMs: toPositiveInt(process.env.WIDGET_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toPositiveInt(process.env.WIDGET_RATE_LIMIT_MAX, 120),
  prefix: 'widget',
  message: 'Too many widget refreshes. Please wait a moment and try again.',
  responseBuilder: ({ retryAfterSeconds }) => ({
    success: false,
    message: 'Too many widget refreshes. Please wait a moment and try again.',
    retryAfterSeconds,
  }),
});

const now = () => Date.now();

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value, ttlMs) => {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: now() + ttlMs });
  return value;
};

const getNewsDataKey = () =>
  String(
    process.env.NEWSDATA_API_KEY ||
      process.env.CRICKET_API_KEY ||
      ''
  ).trim();

const getWeatherKey = () =>
  String(
    process.env.OPENWEATHER_API_KEY ||
      process.env.WEATHER_API_KEY ||
      ''
  ).trim();

const clampInt = (value, fallback, max) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const safeText = (value, fallback = '', maxLength = 240) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : fallback;
};

const safeHttpUrl = (value, fallback = '') => {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
    return parsed.toString();
  } catch (error) {
    return fallback;
  }
};

const roundCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return Math.round(parsed * 100) / 100;
};

const normalizeWeather = (data, cityFallback = 'Delhi') => {
  const weather = Array.isArray(data?.weather) ? data.weather[0] : null;
  const main = data?.main || {};
  const wind = data?.wind || {};
  const sys = data?.sys || {};
  const visibility = Number(data?.visibility);

  if (!Number.isFinite(Number(main.temp))) return null;

  return {
    city: safeText(data?.name, cityFallback, 80),
    temp: Math.round(Number(main.temp)),
    feelsLike: Math.round(Number(main.feels_like ?? main.temp)),
    condition: safeText(weather?.main, 'Clear', 40),
    description: safeText(weather?.description, 'Weather update', 120),
    humidity: Number.isFinite(Number(main.humidity)) ? Number(main.humidity) : null,
    pressure: Number.isFinite(Number(main.pressure)) ? Number(main.pressure) : null,
    windSpeed: Number.isFinite(Number(wind.speed)) ? Math.round(Number(wind.speed) * 3.6) : null,
    visibility: Number.isFinite(visibility) ? Math.round(visibility / 1000) : null,
    sunrise: Number.isFinite(Number(sys.sunrise)) ? new Date(Number(sys.sunrise) * 1000).toISOString() : null,
    sunset: Number.isFinite(Number(sys.sunset)) ? new Date(Number(sys.sunset) * 1000).toISOString() : null,
  };
};

const normalizeArticle = (article, index) => ({
  id: safeText(article?.article_id, String(index), 120),
  title: safeText(article?.title, 'Untitled', 240),
  description: safeText(article?.description, 'No description available', 500),
  image: safeHttpUrl(article?.image_url, 'https://via.placeholder.com/400x250?text=News'),
  source: safeText(article?.source_name || article?.source_id, 'News Source', 120),
  publishedAt: safeText(article?.pubDate, new Date().toISOString(), 60),
  url: safeHttpUrl(article?.link, '#'),
  content: safeText(article?.content || article?.description, '', 1000),
  isExternal: true,
});

const normalizeCricketItem = (item) => {
  const title = safeText(item?.title, 'Cricket update', 180);
  const parts = title.split(/\s+vs\s+/i);
  return {
    type: 'Cricket',
    team1: safeText(parts[0], 'Team 1', 80),
    team2: safeText(parts[1]?.split(/\s+/)[0], 'Team 2', 80),
    score1: 'Live',
    score2: 'Updates',
    overs1: '18.4',
    overs2: '12.3',
    runRate: '8.5',
    reqRate: '9.2',
    status: safeText(item?.description, 'Match in progress', 80),
    isLive: true,
  };
};

const getNewsParams = (category, limit) => {
  const params = {
    language: 'en',
    size: limit,
  };

  switch (category) {
    case 'India':
      params.country = 'in';
      break;
    case 'World':
      params.country = 'us,gb';
      break;
    case 'Business':
      params.category = 'business';
      break;
    case 'Sports':
      params.category = 'sports';
      break;
    case 'Technology':
      params.category = 'technology';
      break;
    case 'Entertainment':
      params.category = 'entertainment';
      break;
    case 'Health':
      params.category = 'health';
      break;
    case 'Esports':
      params.category = 'sports';
      params.q = 'esports';
      break;
    default:
      break;
  }

  return params;
};

const fetchNewsData = async (path, params) => {
  const apiKey = getNewsDataKey();
  if (!apiKey) {
    const error = new Error('News provider is not configured');
    error.statusCode = 503;
    throw error;
  }

  const response = await axios.get(`https://newsdata.io/api/1/${path}`, {
    params: { ...params, apikey: apiKey },
    timeout: providerTimeoutMs,
  });

  return response.data;
};

router.use(widgetLimiter);

router.get('/weather', async (req, res) => {
  try {
    const apiKey = getWeatherKey();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: 'Weather is not configured' });
    }

    const lat = roundCoordinate(req.query.lat, -90, 90);
    const lon = roundCoordinate(req.query.lon, -180, 180);
    const city = safeText(req.query.city, 'Delhi', 80);
    const params = lat !== null && lon !== null
      ? { lat, lon, units: 'metric', appid: apiKey }
      : { q: city, units: 'metric', appid: apiKey };
    const cacheKey = lat !== null && lon !== null ? `weather:${lat}:${lon}` : `weather:city:${city.toLowerCase()}`;

    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params,
      timeout: providerTimeoutMs,
    });

    const weather = normalizeWeather(response.data, city);
    if (!weather) {
      return res.status(502).json({ success: false, message: 'Weather is unavailable' });
    }

    return res.json(setCached(cacheKey, { success: true, weather }, weatherCacheTtlMs));
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      success: false,
      message: 'Weather could not be loaded right now',
    });
  }
});

router.get('/news', async (req, res) => {
  try {
    const category = NEWS_CATEGORIES.has(req.query.category) ? req.query.category : 'All';
    const limit = clampInt(req.query.limit, DEFAULT_NEWS_LIMIT, MAX_NEWS_LIMIT);
    const cacheKey = `news:${category}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const data = await fetchNewsData('latest', getNewsParams(category, limit));
    if (data?.status !== 'success' || !Array.isArray(data.results)) {
      return res.status(502).json({ success: false, message: 'News is unavailable' });
    }

    const articles = data.results.slice(0, limit).map(normalizeArticle);
    return res.json(setCached(cacheKey, { success: true, articles }, newsCacheTtlMs));
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      success: false,
      message: 'News could not be loaded right now',
    });
  }
});

router.get('/cricket', async (req, res) => {
  try {
    const cached = getCached('cricket');
    if (cached) return res.json(cached);

    const data = await fetchNewsData('news', {
      q: 'cricket',
      language: 'en',
      category: 'sports',
      size: 10,
    });
    if (data?.status !== 'success' || !Array.isArray(data.results)) {
      return res.status(502).json({ success: false, message: 'Cricket updates are unavailable' });
    }

    const matches = data.results.slice(0, 2).map(normalizeCricketItem);
    return res.json(setCached('cricket', { success: true, matches }, cricketCacheTtlMs));
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      success: false,
      message: 'Cricket updates could not be loaded right now',
    });
  }
});

module.exports = router;
