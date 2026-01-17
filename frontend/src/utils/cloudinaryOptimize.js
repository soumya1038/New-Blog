export const optimizeImage = (url, options = {}) => {
  if (!url || !url.includes('cloudinary')) return url;
  
  const {
    width = 1920,
    quality = 'auto',
    format = 'auto'
  } = options;
  
  const transformations = `f_${format},q_${quality},w_${width}`;
  
  return url.replace('/upload/', `/upload/${transformations}/`);
};

export const getResponsiveImage = (url, size = 'medium') => {
  const sizes = {
    thumbnail: 150,
    small: 400,
    medium: 800,
    large: 1200,
    xlarge: 1920
  };
  
  return optimizeImage(url, { width: sizes[size] || sizes.medium });
};
