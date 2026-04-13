import React from 'react';
import { motion } from 'framer-motion';

const SectionHeader = ({ type = 'article', label, badge }) => {
  const config = {
    article: {
      font: 'var(--art-font-display)',
      color: 'var(--art-text)',
      accent: 'var(--art-accent)',
      badgeBg: 'var(--art-tag-bg)',
      badgeText: 'var(--art-tag-text)',
    },
    blog: {
      font: 'var(--blog-font-display)',
      color: 'var(--blog-text)',
      accent: 'var(--blog-accent)',
      badgeBg: 'var(--blog-tag-bg)',
      badgeText: 'var(--blog-tag-text)',
    },
    short: {
      font: 'var(--short-font-display)',
      color: 'var(--short-text)',
      accent: 'var(--short-accent)',
      badgeBg: 'var(--short-tag-bg)',
      badgeText: 'var(--short-tag-text)',
    },
  };

  const style = config[type] || config.article;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
      style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
    >
      <h2
        style={{
          fontFamily: style.font,
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          color: style.color,
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        {label}
      </h2>

      {badge && (
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: style.badgeText,
            background: style.badgeBg,
            padding: '6px 14px',
            borderRadius: type === 'article' ? '0px' : type === 'blog' ? '6px' : '8px',
          }}
        >
          {badge}
        </span>
      )}

      <div
        style={{
          flex: 1,
          height: '2px',
          background: `linear-gradient(90deg, ${style.accent} 0%, transparent 100%)`,
          minWidth: '100px',
        }}
      />
    </motion.div>
  );
};

export default SectionHeader;
