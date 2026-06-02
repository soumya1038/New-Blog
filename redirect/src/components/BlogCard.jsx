import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { getBlogPath } from '../utils/contentRoutes';
import Avatar from './Avatar';
import ProductPromoCard from './ProductPromoCard';

const BlogCard = ({ blog, index = 0, onLike, onTagClick }) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(blog?.likes?.length || 0);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    const newLikes = isLiked ? likes - 1 : likes + 1;
    setLikes(newLikes);
    if (onLike) onLike(blog._id, newLikes);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.33, 1, 0.68, 1] }}
      whileHover={{ y: -4, boxShadow: 'var(--blog-shadow-hover)' }}
      style={{
        background: 'var(--blog-card-bg)',
        borderRadius: '12px',
        borderTop: 'var(--blog-border)',
        padding: '24px',
        transition: 'all var(--transition-card)',
        boxShadow: 'var(--blog-shadow)',
      }}
    >
      <Link to={getBlogPath(blog)} style={{ textDecoration: 'none' }}>
        {blog.coverImage && (
          <div style={{ width: '100%', height: '200px', overflow: 'hidden', marginBottom: '18px', borderRadius: '12px' }}>
            <img
              src={blog.coverImage}
              alt={blog.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms var(--ease-smooth)' }}
              onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {blog.tags?.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              onClick={(e) => { e.preventDefault(); if (onTagClick) onTagClick(tag); }}
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--blog-tag-text)',
                background: 'var(--blog-tag-bg)',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h3
          style={{
            fontFamily: 'var(--blog-font-display)',
            fontSize: 'clamp(18px, 2.2vw, 22px)',
            fontWeight: 700,
            color: 'var(--blog-text)',
            marginBottom: '10px',
            lineHeight: 1.3,
            letterSpacing: '-0.015em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {blog.title}
        </h3>

        <p
          style={{
            fontFamily: 'var(--blog-font-body)',
            fontSize: '14px',
            color: 'var(--blog-muted)',
            lineHeight: 1.6,
            marginBottom: '18px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {blog.excerpt || blog.content?.substring(0, 150)}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid rgba(37,99,235,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar user={blog.author} size="sm" showStatusRing />
            <div>
              <p style={{ fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: 600, color: 'var(--blog-text)' }}>
                {blog.author?.username}
              </p>
              <p style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: 'var(--blog-muted)' }}>
                {new Date(blog.createdAt).toLocaleDateString()}
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
              color: isLiked ? 'var(--blog-like)' : 'var(--blog-muted)',
              transition: 'color 200ms',
            }}
          >
            {isLiked ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{likes}</span>
          </motion.button>
        </div>
      </Link>
      {blog.linkedProduct && blog.linkedProduct._id && (
        <div style={{ marginTop: '12px' }}>
          <ProductPromoCard product={blog.linkedProduct} />
        </div>
      )}
    </motion.article>
  );
};

export default BlogCard;
