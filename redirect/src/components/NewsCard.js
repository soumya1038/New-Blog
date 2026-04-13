import React from 'react';
import { FaClock, FaExternalLinkAlt } from 'react-icons/fa';

const NewsCard = ({ news, onClick }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={news.image}
          alt={news.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        {news.isExternal && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white p-2 rounded-full">
            <FaExternalLinkAlt className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {news.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {news.description}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <span className="font-semibold">{news.source}</span>
          <div className="flex items-center gap-1">
            <FaClock className="w-3 h-3" />
            <span>{formatDate(news.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
