import React from 'react';
import { IoClose } from 'react-icons/io5';
import { FaClock, FaShareAlt } from 'react-icons/fa';

const NewsModal = ({ news, onClose }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: news.description,
          url: news.url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(news.url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{news.source}</span>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <FaClock className="w-3 h-3" />
              <span>{formatDate(news.publishedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <FaShareAlt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <IoClose className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {news.image && (
            <img
              src={news.image}
              alt={news.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl mb-6"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {news.title}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {news.description}
          </p>
          {news.content && (
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {news.content}
              </p>
            </div>
          )}
          {news.url && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Read full article on {news.source} →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
