const Blog = require('../models/Blog');
const Article = require('../models/Article');

const BLOG_TEXT_INDEX_NAME = 'blog_weighted_text_search';
const ARTICLE_TEXT_INDEX_NAME = 'article_weighted_text_search';

const BLOG_TEXT_INDEX_KEYS = {
  title: 'text',
  content: 'text',
  tags: 'text',
  category: 'text',
  metaDescription: 'text'
};

const ARTICLE_TEXT_INDEX_KEYS = {
  title: 'text',
  content: 'text',
  tags: 'text',
  category: 'text',
  metaDescription: 'text'
};

const BLOG_TEXT_INDEX_OPTIONS = {
  name: BLOG_TEXT_INDEX_NAME,
  weights: {
    title: 12,
    tags: 7,
    metaDescription: 6,
    category: 4,
    content: 2
  },
  default_language: 'english'
};

const ARTICLE_TEXT_INDEX_OPTIONS = {
  name: ARTICLE_TEXT_INDEX_NAME,
  weights: {
    title: 14,
    tags: 8,
    metaDescription: 7,
    category: 4,
    content: 2
  },
  default_language: 'english'
};

const hasAnyTextKey = (index = {}) => Object.values(index.key || {}).includes('text');

const normalizeTextIndexSignature = (keys = {}) =>
  JSON.stringify(
    Object.entries(keys)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
  );

const ensureWeightedTextIndex = async (Model, keys, options) => {
  const collection = Model.collection;
  const indexes = await collection.indexes();
  const desiredSignature = normalizeTextIndexSignature(keys);

  const existingNamed = indexes.find((idx) => idx.name === options.name && hasAnyTextKey(idx));
  if (existingNamed) {
    const currentSignature = normalizeTextIndexSignature(existingNamed.key || {});
    if (currentSignature === desiredSignature) {
      return { status: 'unchanged', index: options.name };
    }
    await collection.dropIndex(existingNamed.name);
  } else {
    const otherTextIndexes = indexes.filter((idx) => hasAnyTextKey(idx));
    for (const idx of otherTextIndexes) {
      await collection.dropIndex(idx.name);
    }
  }

  await collection.createIndex(keys, options);
  return { status: 'created', index: options.name };
};

const ensureSearchIndexes = async () => {
  const [blogResult, articleResult] = await Promise.all([
    ensureWeightedTextIndex(Blog, BLOG_TEXT_INDEX_KEYS, BLOG_TEXT_INDEX_OPTIONS),
    ensureWeightedTextIndex(Article, ARTICLE_TEXT_INDEX_KEYS, ARTICLE_TEXT_INDEX_OPTIONS)
  ]);

  console.log(
    `[search] Text indexes ready (blog: ${blogResult.status}, article: ${articleResult.status}).`
  );
};

module.exports = {
  ensureSearchIndexes
};
