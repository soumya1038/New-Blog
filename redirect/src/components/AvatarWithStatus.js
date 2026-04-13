import React from 'react';
import Avatar from './Avatar';

const AvatarWithStatus = ({ user, size = 'md', hasStatus = false, className = '' }) => {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36'
  };

  const paddingSizes = {
    sm: 'p-0.5',
    md: 'p-0.5',
    lg: 'p-1',
    xl: 'p-1'
  };

  if (!hasStatus) {
    return <Avatar user={user} size={size} className={className} />;
  }

  return (
    <div className={`${sizes[size]} ${className} relative`}>
      <div className={`${sizes[size]} rounded-full ${paddingSizes[size]} bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-spin-slow`}>
        <div className="w-full h-full rounded-full bg-white p-0.5">
          <Avatar user={user} size={size} />
        </div>
      </div>
    </div>
  );
};

export default AvatarWithStatus;
