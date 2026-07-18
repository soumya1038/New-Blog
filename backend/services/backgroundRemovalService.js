const axios = require('axios');
const crypto = require('crypto');
const cloudinary = require('../utils/cloudinary');
const Product = require('../models/Product');
const { logError, logWarn } = require('../utils/safeErrorLog');
const {
  getBackgroundRemovalProvider,
  getBackgroundRemovalServiceBaseUrl,
  getBackgroundRemovalTimeoutMs,
  getRemoveBgApiUrl,
  isBackgroundRemovalEnabled,
} = require('../utils/backgroundRemovalConfig');

const BACKGROUND_REMOVAL_UNAVAILABLE_MESSAGE = 'Background removal unavailable';
const BACKGROUND_REMOVAL_FAILED_MESSAGE = 'Background removal failed';

const hashSource = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

const uploadPngToCloudinary = (buffer, productId, options = {}) =>
  new Promise((resolve, reject) => {
    const folder = options.folder || 'lekhon/products/transparent';
    const publicIdPrefix = options.publicIdPrefix || `product-${productId}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${publicIdPrefix}-${Date.now()}`,
        resource_type: 'image',
        format: 'png',
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

const removeWithRemoveBg = async (imageUrl) => {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  const apiUrl = getRemoveBgApiUrl();

  if (!apiKey) {
    throw new Error('remove.bg API key is not configured.');
  }

  const response = await axios.postForm(apiUrl, {
    image_url: imageUrl,
    size: process.env.REMOVE_BG_SIZE || 'auto',
    format: 'png',
  }, {
    headers: {
      'X-Api-Key': apiKey,
    },
    responseType: 'arraybuffer',
    timeout: getBackgroundRemovalTimeoutMs(),
  });

  return Buffer.from(response.data);
};

const removeWithSelfHostedService = async (imageUrl) => {
  const serviceUrl = getBackgroundRemovalServiceBaseUrl();
  const apiKey = process.env.BG_REMOVER_API_KEY;

  if (!serviceUrl || !apiKey) {
    throw new Error('Background remover service is not configured.');
  }

  const response = await axios.post(
    `${serviceUrl}/remove-background`,
    { imageUrl },
    {
      headers: { 'x-api-key': apiKey },
      responseType: 'arraybuffer',
      timeout: getBackgroundRemovalTimeoutMs(),
    }
  );

  return Buffer.from(response.data);
};

const removeBackground = async (imageUrl) => {
  if (getBackgroundRemovalProvider() === 'service') {
    return removeWithSelfHostedService(imageUrl);
  }

  return removeWithRemoveBg(imageUrl);
};

const removeImageUrlToCloudinary = async (imageUrl, options = {}) => {
  const removedImage = await removeBackground(imageUrl);
  const upload = await uploadPngToCloudinary(removedImage, options.publicIdSeed || 'external', {
    folder: options.folder || 'lekhon/content-products/transparent',
    publicIdPrefix: options.publicIdPrefix || 'content-product',
  });

  return {
    url: upload.secure_url,
    publicId: upload.public_id,
  };
};

const processProductThumbnail = async (productOrId) => {
  const product = productOrId && typeof productOrId === 'object' && typeof productOrId.save === 'function'
    ? productOrId
    : await Product.findById(productOrId);

  if (!product) return null;
  if (!isBackgroundRemovalEnabled()) {
    product.backgroundRemovalStatus = 'skipped';
    await product.save();
    return null;
  }

  const imageUrl = product.thumbnail;
  if (!imageUrl) {
    product.backgroundRemovalStatus = 'skipped';
    await product.save();
    return null;
  }

  const sourceHash = hashSource(imageUrl);
  if (product.transparentThumbnail && product.backgroundRemovalSourceHash === sourceHash) {
    product.backgroundRemovalStatus = 'done';
    await product.save();
    return {
      transparentThumbnail: product.transparentThumbnail,
      transparentThumbnailPublicId: product.transparentThumbnailPublicId,
    };
  }

  if (getBackgroundRemovalProvider() === 'removebg' && !process.env.REMOVE_BG_API_KEY) {
    product.backgroundRemovalStatus = 'skipped';
    product.backgroundRemovalError = BACKGROUND_REMOVAL_UNAVAILABLE_MESSAGE;
    await product.save();
    return null;
  }

  if (getBackgroundRemovalProvider() === 'service' && (!getBackgroundRemovalServiceBaseUrl() || !process.env.BG_REMOVER_API_KEY)) {
    product.backgroundRemovalStatus = 'skipped';
    product.backgroundRemovalError = BACKGROUND_REMOVAL_UNAVAILABLE_MESSAGE;
    await product.save();
    return null;
  }

  try {
    product.backgroundRemovalStatus = 'processing';
    product.backgroundRemovalError = '';
    await product.save();

    const removedImage = await removeBackground(imageUrl);
    const upload = await uploadPngToCloudinary(removedImage, product._id);
    product.transparentThumbnail = upload.secure_url;
    product.transparentThumbnailPublicId = upload.public_id;
    product.backgroundRemovalStatus = 'done';
    product.backgroundRemovalError = '';
    product.backgroundRemovedAt = new Date();
    product.backgroundRemovalSourceHash = sourceHash;
    await product.save();

    return {
      transparentThumbnail: product.transparentThumbnail,
      transparentThumbnailPublicId: product.transparentThumbnailPublicId,
    };
  } catch (error) {
    logError('[backgroundRemoval] Thumbnail processing failed:', error);
    product.backgroundRemovalStatus = 'failed';
    product.backgroundRemovalError = BACKGROUND_REMOVAL_FAILED_MESSAGE;
    await product.save();
    return null;
  }
};

const triggerProductThumbnailProcessing = (productOrId) => {
  processProductThumbnail(productOrId).catch((error) => {
    logWarn('[background-removal] Processing failed:', error);
  });
};

module.exports = {
  BACKGROUND_REMOVAL_FAILED_MESSAGE,
  BACKGROUND_REMOVAL_UNAVAILABLE_MESSAGE,
  processProductThumbnail,
  removeImageUrlToCloudinary,
  triggerProductThumbnailProcessing,
};
