import React, { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiFile, FiImage } from 'react-icons/fi';
import { GoDownload } from 'react-icons/go';
import api from '../services/api';
import { getSafeHttpUrl, getSafeImageUrl } from '../utils/safeMediaUrls';

const FileMessage = ({ messageId, fileUrl, fileName, fileSize, mimeType, caption, isOwn }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageRequested, setImageRequested] = useState(isOwn);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const isImage = mimeType?.startsWith('image/');

  const resolveDirectUrl = useCallback(() => (
    isImage ? getSafeImageUrl(fileUrl) : getSafeHttpUrl(fileUrl)
  ), [fileUrl, isImage]);

  const requestAccessUrl = useCallback(async () => {
    if (resolvedUrl) return resolvedUrl;
    const directUrl = resolveDirectUrl();
    if (!messageId) {
      if (directUrl) setResolvedUrl(directUrl);
      return directUrl;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/files/messages/${messageId}/access`);
      const safeUrl = isImage ? getSafeImageUrl(data?.url) : getSafeHttpUrl(data?.url);
      if (!safeUrl) throw new Error('Invalid media URL');
      setResolvedUrl(safeUrl);
      return safeUrl;
    } catch (error) {
      setLoadError(true);
      return '';
    } finally {
      setLoading(false);
    }
  }, [isImage, messageId, resolveDirectUrl, resolvedUrl]);

  useEffect(() => {
    if (isImage && imageRequested && !resolvedUrl && !loading && !loadError) {
      requestAccessUrl();
    }
  }, [imageRequested, isImage, loadError, loading, requestAccessUrl, resolvedUrl]);

  const formatFileSize = (bytes) => {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openDownload = async () => {
    const url = await requestAccessUrl();
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || 'attachment';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (isImage) {
    return (
      <>
        <div className="space-y-2">
          <div
            className="relative group cursor-pointer"
            onClick={() => resolvedUrl && setShowImageModal(true)}
          >
            {resolvedUrl ? (
              <>
                <img
                  src={resolvedUrl}
                  alt={fileName || 'Chat attachment'}
                  className="w-full max-w-[250px] sm:max-w-xs rounded-lg object-contain"
                  style={{ maxHeight: '300px' }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <FiImage className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                className="w-full max-w-[250px] sm:max-w-xs rounded-lg bg-gray-200 flex flex-col items-center justify-center p-8 disabled:opacity-70"
                style={{ minHeight: '200px' }}
                onClick={(event) => {
                  event.stopPropagation();
                  setLoadError(false);
                  setImageRequested(true);
                }}
              >
                {loadError ? <FiImage className="w-12 h-12 text-gray-600 mb-2" /> : <GoDownload className="w-12 h-12 text-gray-600 mb-2" />}
                <span className="text-sm text-gray-600 text-center">
                  {loading ? 'Loading image...' : loadError ? 'Image unavailable' : 'Load image'}
                </span>
                <span className="text-xs text-gray-500 mt-1">{formatFileSize(fileSize)}</span>
              </button>
            )}
          </div>
          {caption && <p className="text-sm break-words leading-relaxed">{caption}</p>}
        </div>

        {showImageModal && resolvedUrl && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowImageModal(false)}
          >
            <img
              src={resolvedUrl}
              alt={fileName || 'Chat attachment'}
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              title="Download image"
              className="absolute top-4 right-4 p-3 bg-white rounded-full hover:bg-gray-100 transition-colors"
              onClick={(event) => {
                event.stopPropagation();
                openDownload();
              }}
            >
              <FiDownload className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isOwn ? 'bg-white bg-opacity-20 border-white border-opacity-30' : 'bg-white border-gray-200'
    }`}>
      <FiFile className={`w-7 h-7 flex-shrink-0 ${isOwn ? 'text-white' : 'text-gray-600'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
          {fileName || 'Attachment'}
        </p>
        <p className={`text-xs ${isOwn ? 'text-white text-opacity-70' : 'text-gray-500'}`}>
          {loadError ? 'File unavailable' : formatFileSize(fileSize)}
        </p>
      </div>
      <button
        type="button"
        title="Download file"
        disabled={loading}
        onClick={openDownload}
        className={`p-2 rounded-full transition-colors disabled:opacity-60 ${
          isOwn
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <FiDownload className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-gray-700'}`} />
      </button>
    </div>
  );
};

export default FileMessage;
