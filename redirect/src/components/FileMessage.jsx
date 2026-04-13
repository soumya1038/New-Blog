import React, { useState } from 'react';
import { FiDownload, FiFile, FiImage } from 'react-icons/fi';
import { GoDownload } from 'react-icons/go';

const FileMessage = ({ fileUrl, fileName, fileSize, mimeType, caption, isOwn }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(isOwn);
  const isImage = mimeType?.startsWith('image/');

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = () => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📽️';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '🗜️';
    if (mimeType?.includes('text')) return '📃';
    return '📎';
  };

  if (isImage) {
    return (
      <>
        <div className="space-y-2">
          <div className="relative group cursor-pointer" onClick={() => imageLoaded && setShowImageModal(true)}>
            {imageLoaded ? (
              <>
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="w-full max-w-[250px] sm:max-w-xs rounded-lg object-contain"
                  style={{ maxHeight: '300px' }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <FiImage className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </>
            ) : (
              <div 
                className="w-full max-w-[250px] sm:max-w-xs rounded-lg bg-gray-200 flex flex-col items-center justify-center p-8"
                style={{ minHeight: '200px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setImageLoaded(true);
                }}
              >
                <GoDownload className="w-12 h-12 text-gray-600 mb-2" />
                <p className="text-sm text-gray-600 text-center">Click to load image</p>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(fileSize)}</p>
              </div>
            )}
          </div>
          {caption && (
            <p className="text-sm break-words leading-relaxed">{caption}</p>
          )}
        </div>

        {showImageModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowImageModal(false)}
          >
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
            <a
              href={fileUrl}
              download={fileName}
              className="absolute top-4 right-4 p-3 bg-white rounded-full hover:bg-gray-100 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <FiDownload className="w-6 h-6 text-gray-700" />
            </a>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isOwn ? 'bg-white bg-opacity-20 border-white border-opacity-30' : 'bg-white border-gray-200'
    }`}>
      <div className="text-3xl">{getFileIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
          {fileName}
        </p>
        <p className={`text-xs ${isOwn ? 'text-white text-opacity-70' : 'text-gray-500'}`}>
          {formatFileSize(fileSize)}
        </p>
      </div>
      <a
        href={fileUrl}
        download={fileName}
        className={`p-2 rounded-full transition-colors ${
          isOwn 
            ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <FiDownload className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-gray-700'}`} />
      </a>
    </div>
  );
};

export default FileMessage;
