import React, { useState, useRef, useEffect } from 'react';

export const VirtualTable = ({ data, columns, rowHeight = 60, containerHeight = 600 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleStart = Math.floor(scrollTop / rowHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / rowHeight) + 1,
    data.length
  );

  const visibleData = data.slice(visibleStart, visibleEnd);
  const offsetY = visibleStart * rowHeight;
  const totalHeight = data.length * rowHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto' }}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleData.map((row, idx) => (
                <tr key={visibleStart + idx} style={{ height: rowHeight }}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
