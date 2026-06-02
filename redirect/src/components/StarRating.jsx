import React, { useState } from 'react';
import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';

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
    const filled = display >= i;
    const half   = !filled && display >= i - 0.5;
    const Icon   = filled ? FaStar : half ? FaStarHalfAlt : FaRegStar;
    const color  = filled || half ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600';

    return (
      <span
        key={i}
        className={`${color} ${interactive ? 'cursor-pointer transition-colors' : ''}`}
        onMouseEnter={() => interactive && setHovered(i)}
        onMouseLeave={() => interactive && setHovered(0)}
        onClick={()     => interactive && onChange && onChange(i)}
      >
        <Icon size={size} />
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
