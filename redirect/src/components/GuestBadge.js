import React from 'react';
import { TbBrandAmongUs } from 'react-icons/tb';

const GuestBadge = ({ size = 'sm' }) => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400" title="Guest User">
      <TbBrandAmongUs className={sizes[size]} />
    </span>
  );
};

export default GuestBadge;
