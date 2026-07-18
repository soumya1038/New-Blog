import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

// Display-only:  <StarRating value={4.5} count={23} />
// Interactive:   <StarRating value={rating} onChange={setRating} interactive />
const StarRating = ({
  value = 0,
  count,
  onChange,
  interactive = false,
  size = 16,
  className = '',
}) => {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;

  const renderStar = (i) => {
    const fillPercent = Math.max(0, Math.min(100, (display - (i - 1)) * 100));

    return (
      <span
        key={i}
        className={`relative inline-block text-gray-300 dark:text-gray-600 ${interactive ? 'cursor-pointer transition-colors' : ''}`}
        style={{ width: size, height: size, lineHeight: 0 }}
        onMouseEnter={() => interactive && setHovered(i)}
        onMouseLeave={() => interactive && setHovered(0)}
        onClick={()     => interactive && onChange && onChange(i)}
      >
        <FaRegStar size={size} />
        {fillPercent > 0 && (
          <span
            className="absolute inset-0 overflow-hidden text-amber-400"
            style={{ width: `${fillPercent}%` }}
            aria-hidden="true"
          >
            <FaStar size={size} />
          </span>
        )}
      </span>
    );
  };

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(renderStar)}
      {count !== undefined && (
        <span className="ml-1 text-xs text-[var(--text-muted)]">
          ({count.toLocaleString()})
        </span>
      )}
    </span>
  );
};

export default StarRating;
