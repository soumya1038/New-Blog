import React from 'react';
import { MdStorefront } from 'react-icons/md';

// Usage: <SellerBadge size="sm" /> or <SellerBadge size="md" withLabel />
const SellerBadge = ({ size = 'sm', withLabel = false, className = '' }) => {
  const sizeMap = {
    xs: { icon: 10, text: 'text-[10px]', pad: 'px-1 py-0.5', gap: 'gap-0.5' },
    sm: { icon: 12, text: 'text-xs',     pad: 'px-1.5 py-0.5', gap: 'gap-1' },
    md: { icon: 14, text: 'text-sm',     pad: 'px-2 py-1',     gap: 'gap-1' },
  };
  const s = sizeMap[size] || sizeMap.sm;

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.pad} rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ${className}`}
      title="Verified Seller"
    >
      <MdStorefront size={s.icon} />
      {withLabel && <span className={s.text}>Seller</span>}
    </span>
  );
};

export default SellerBadge;
