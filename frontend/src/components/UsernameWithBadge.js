import React from 'react';
import { GoVerified, GoUnverified } from 'react-icons/go';

const UsernameWithBadge = ({ user, className = '', showUnverified = true, badgeSize = 'auto' }) => {
  if (!user) return null;

  const isGuest = user.isGuest || user.role === 'guest';
  
  // Calculate badge size based on text size if auto
  const getBadgeSize = () => {
    if (badgeSize !== 'auto') return badgeSize;
    // Default to slightly smaller than text
    return 16;
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {user.username}
      {!isGuest && user.isVerified && (
        <GoVerified className="text-blue-500 flex-shrink-0" size={getBadgeSize()} title="Verified" />
      )}
      {!isGuest && !user.isVerified && showUnverified && (
        <GoUnverified className="text-gray-400 flex-shrink-0" size={getBadgeSize()} title="Not Verified" />
      )}
    </span>
  );
};

export default UsernameWithBadge;
