import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { getSafeImageUrl } from '../utils/safeMediaUrls';

const ShortPreviewCard = ({ short, index = 0 }) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(short?.likes?.length || 0);
  const authorProfileImage = getSafeImageUrl(short?.author?.profileImage);
  const shortImage = getSafeImageUrl(short?.image);

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.33, 1, 0.68, 1] }}
      whileHover={{ scale: 1.03 }}
      style={{
        background: 'var(--short-card-bg)',
        borderRadius: '10px',
        padding: '20px',
        transition: 'all var(--transition-card)',
        boxShadow: 'var(--short-shadow)',
        cursor: 'pointer',
        border: '1px solid rgba(34,197,94,0.1)',
        contentVisibility: 'auto',
        containIntrinsicSize: '300px',
      }}
    >
      <Link to={`/shorts/${short._id}`} style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          {authorProfileImage && (
            <img
              src={authorProfileImage}
              alt={short.author.username}
              referrerPolicy="no-referrer"
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--short-accent)' }}
            />
          )}
          <div>
            <p
              style={{
                fontFamily: 'var(--short-font-display)',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--short-text)',
              }}
            >
              {short.author?.username}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: '11px',
                color: 'var(--short-muted)',
              }}
            >
              {new Date(short.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <p
          style={{
            fontFamily: 'var(--short-font-display)',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--short-text)',
            lineHeight: 1.5,
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {short.content}
        </p>

        {shortImage && (
          <div
            style={{
              width: '100%',
              height: '160px',
              overflow: 'hidden',
              marginBottom: '14px',
              borderRadius: '10px',
            }}
          >
            <img
              src={shortImage}
              alt="Short content"
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(34,197,94,0.15)' }}>
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
              color: isLiked ? 'var(--short-pulse)' : 'var(--short-muted)',
              transition: 'color 200ms',
            }}
          >
            {isLiked ? <FaHeart size={18} /> : <FaRegHeart size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--short-font-display)' }}>{likes}</span>
          </motion.button>

          <span style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', color: 'var(--short-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {short.views || 0} views
          </span>
        </div>
      </Link>
    </motion.article>
  );
};

export default ShortPreviewCard;
