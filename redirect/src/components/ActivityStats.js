import React from 'react';
import { FaEye, FaHeart, FaComment, FaFileAlt } from 'react-icons/fa';

const ActivityStats = ({ blogs, articles, shorts, user }) => {
  const totalPosts = blogs.length + articles.length + shorts.length;
  const totalLikes = [...blogs, ...articles, ...shorts].reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalComments = [...blogs, ...articles].reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  const totalViews = [...blogs, ...articles].reduce((sum, post) => sum + (post.views || 0), 0);

  const stats = [
    { icon: FaEye, label: 'Views', value: totalViews, color: 'text-blue-500', border: 'border-blue-500/15' },
    { icon: FaHeart, label: 'Likes', value: totalLikes, color: 'text-rose-500', border: 'border-rose-500/15' },
    { icon: FaComment, label: 'Comments', value: totalComments, color: 'text-emerald-500', border: 'border-emerald-500/15' },
    { icon: FaFileAlt, label: 'Posts', value: totalPosts, color: 'text-amber-500', border: 'border-amber-500/15' }
  ];

  const mostPopular = [...blogs, ...articles].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0];

  return (
    <div className="theme-panel rounded-2xl shadow-sm p-5 border border-[var(--border-default)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Your Activity</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border bg-[var(--background-secondary)] border-[var(--border-default)] ${stat.border}`}
          >
            <stat.icon className={`${stat.color} mb-1.5`} size={18} />
            <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>
      {mostPopular && (
        <div className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]">
          <p className="text-xs text-[var(--brand-primary)] font-medium mb-1">Most Popular</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{mostPopular.title}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{mostPopular.likes?.length || 0} likes</p>
        </div>
      )}
    </div>
  );
};

export default ActivityStats;
