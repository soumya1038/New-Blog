const resolveEntityIdentifier = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  return entity.slug || entity._id || '';
};

export const getBlogPath = (blog) => `/blog/${resolveEntityIdentifier(blog)}`;

export const getArticlePath = (article) => `/article/${resolveEntityIdentifier(article)}`;
