import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

const ArticleCard = ({ article, index = 0, onLike, onTagClick }) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(article?.likes?.length || 0);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    const newLikes = isLiked ? likes - 1 : likes + 1;
    setLikes(newLikes);
    if (onLike) onLike(article._id, newLikes);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.33, 1, 0.68, 1] }}
      whileHover={{ background: 'var(--art-card-hover)' }}
      style={{
        background: 'var(--art-card-bg)',
        borderRadius: '0px',
        borderLeft: 'var(--art-border)',
        padding: '24px',
        transition: 'background var(--transition-card)',
        boxShadow: 'var(--art-shadow)',
      }}
    >
      <Link to={`/article/${article._id}`} style={{ textDecoration: 'none' }}>
        {article.coverImage && (
          <div style={{ width: '100%', height: '220px', overflow: 'hidden', marginBottom: '20px', borderRadius: '0px' }}>
            <img
              src={article.coverImage}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms var(--ease-smooth)' }}
              onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {article.tags?.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              onClick={(e) => { e.preventDefault(); if (onTagClick) onTagClick(tag); }}
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--art-tag-text)',
                background: 'var(--art-tag-bg)',
                padding: '4px 10px',
                borderRadius: '0px',
                cursor: 'pointer',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h3
          style={{
            fontFamily: 'var(--art-font-display)',
            fontSize: 'clamp(20px, 2.5vw, 24px)',
            fontWeight: 700,
            color: 'var(--art-text)',
            marginBottom: '12px',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.title}
        </h3>

        <p
          style={{
            fontFamily: 'var(--art-font-body)',
            fontSize: '15px',
            color: 'var(--art-muted)',
            lineHeight: 1.6,
            marginBottom: '20px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.excerpt || article.content?.substring(0, 150)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(184,150,12,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {article.author?.profileImage && (
              <img
                src={article.author.profileImage}
                alt={article.author.username}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div>
              <p style={{ fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: 600, color: 'var(--art-text)' }}>
                {article.author?.username}
              </p>
              <p style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: 'var(--art-muted)' }}>
                {article.readingTime || 5} min read
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleLike}
            whileTap={{ scale: 0.85 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: isLiked ? 'var(--art-like)' : 'var(--art-muted)',
              transition: 'color 200ms',
            }}
          >
            {isLiked ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{likes}</span>
          </motion.button>
        </div>
      </Link>
    </motion.article>
  );
};

export default ArticleCard;
