import React, { useState } from 'react';
import md5 from 'crypto-js/md5';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [gravatarError, setGravatarError] = useState(false);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-4xl'
  };

  const getGravatarUrl = (email) => {
    if (!email) return null;
    const hash = md5(email.toLowerCase().trim()).toString();
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
  };

  const getInitials = (username) => {
    return username?.charAt(0).toUpperCase() || '?';
  };

  const getColorFromUsername = (username) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    const index = username?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  // Priority: profileImage > Gravatar > Initials
  if (user?.profileImage && !imageError) {
    return (
      <img
        src={user.profileImage}
        alt={user.username}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  const gravatarUrl = getGravatarUrl(user?.email);
  if (gravatarUrl && !gravatarError && !imageError) {
    return (
      <img
        src={gravatarUrl}
        alt={user?.username}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
        onError={() => setGravatarError(true)}
      />
    );
  }

  // Fallback to initials
  return (
    <div
      className={`${sizes[size]} rounded-full ${getColorFromUsername(user?.username)} text-white font-bold flex items-center justify-center ${className}`}
    >
      {getInitials(user?.username)}
    </div>
  );
};

export default Avatar;
