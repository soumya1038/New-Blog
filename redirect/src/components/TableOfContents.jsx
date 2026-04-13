import React, { useState, useEffect } from 'react';

const TableOfContents = ({ content }) => {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const lines = content?.split('\n') || [];
    const parsed = lines
      .filter(line => line.startsWith('## ') || line.startsWith('### '))
      .map((line, i) => ({
        level: line.startsWith('### ') ? 3 : 2,
        text: line.replace(/^#{2,3} /, ''),
        id: `heading-${i}`,
      }));
    setHeadings(parsed);
  }, [content]);

  if (headings.length < 3) return null;

  return (
    <nav className="p-5 rounded-xl mb-8 sticky top-24"
      style={{ background: 'var(--article-tag-bg)', border: '1px solid var(--article-border)' }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-3"
        style={{ color: 'var(--article-tag-text)', fontFamily: 'var(--article-font-display)' }}>
        Contents
      </p>
      <ol className="space-y-2">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? 16 : 0 }}>
            <a href={`#${h.id}`} className="text-sm hover:underline"
              style={{ color: activeId === h.id ? 'var(--article-accent)' : 'var(--article-muted)' }}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default TableOfContents;
