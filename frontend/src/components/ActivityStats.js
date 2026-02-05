import React from 'react';
import { FaEye, FaHeart, FaComment, FaFileAlt } from 'react-icons/fa';

const ActivityStats = ({ blogs, articles, shorts, user }) => {
  const totalPosts = blogs.length + articles.length + shorts.length;
  const totalLikes = [...blogs, ...articles, ...shorts].reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalComments = [...blogs, ...articles].reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  const totalViews = [...blogs, ...articles].reduce((sum, post) => sum + (post.views || 0), 0);

  const stats = [
    { icon: FaEye, label: 'Views', value: totalViews, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { icon: FaHeart, label: 'Likes', value: totalLikes, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { icon: FaComment, label: 'Comments', value: totalComments, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: FaFileAlt, label: 'Posts', value: totalPosts, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  ];

  const mostPopular = [...blogs, ...articles].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Your Activity</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`${stat.bg} p-3 rounded-xl border border-gray-100 dark:border-gray-700`}>
            <stat.icon className={`${stat.color} mb-1.5`} size={18} />
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
      {mostPopular && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">⭐ Most Popular</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{mostPopular.title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{mostPopular.likes?.length || 0} likes</p>
        </div>
      )}
    </div>
  );
};

export default ActivityStats;
