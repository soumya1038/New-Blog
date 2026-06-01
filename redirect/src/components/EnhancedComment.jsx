import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiFillLike, AiOutlineDislike, AiOutlineLike } from 'react-icons/ai';
import { FiHeart } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import { HiArrowDown, HiArrowUp } from 'react-icons/hi';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { MdDelete, MdEdit } from 'react-icons/md';
import { GoVerified } from 'react-icons/go';
import { TbBrandAmongUs } from 'react-icons/tb';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';

const MAX_VISUAL_DEPTH = 4;

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return value._id || '';
  return value;
};

const idsMatch = (left, right) => String(getId(left)) === String(getId(right));

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatTimeAgo = (value) => {
  if (!value) return '';

  const createdAt = new Date(value).getTime();
  const diffSeconds = Math.max(1, Math.floor((Date.now() - createdAt) / 1000));

  if (diffSeconds < 60) return 'just now';

  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];

  const [label, seconds] = units.find(([, unitSeconds]) => diffSeconds >= unitSeconds);
  const amount = Math.floor(diffSeconds / seconds);
  return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
};

const renderCommentText = (content = '', replyToUser) => {
  const parts = [];
  let text = content;

  if (replyToUser?.username) {
    const mention = `@${replyToUser.username}`;
    const leadingMention = new RegExp(`^${escapeRegExp(mention)}\\s*`, 'i');
    text = text.replace(leadingMention, '');
    parts.push({ type: 'mention', value: mention, key: 'reply-to' });
    if (text.trim()) {
      parts.push({ type: 'text', value: ' ', key: 'reply-gap' });
    }
  }

  text.split(/(@[\w.-]+)/g).forEach((part, index) => {
    if (!part) return;
    parts.push({
      type: part.startsWith('@') ? 'mention' : 'text',
      value: part,
      key: `part-${index}`,
    });
  });

  return parts.map((part) => (
    <span
      key={part.key}
      className={part.type === 'mention' ? 'nb-comment-mention' : undefined}
    >
      {part.value}
    </span>
  ));
};

const EnhancedComment = ({
  comment,
  isOwner,
  onReply,
  onLike,
  onDislike,
  onHeart,
  onPin,
  onDelete,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  editingComment,
  editText,
  setEditText,
  onLoadReplies,
  replies = [],
  replyMap,
  showReplies = false,
  showRepliesMap,
  loadingReplies = false,
  loadingRepliesMap,
  isReply = false,
  deletingComment,
  postOwner,
  showAuthorBadge = false,
  depth = 0,
  maxDepth = MAX_VISUAL_DEPTH,
}) => {
  const { user } = useContext(AuthContext);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const author = comment.author || {};
  const authorId = getId(author);
  const commentReplies = replyMap ? (replyMap[comment._id] || []) : replies;
  const repliesVisible = showRepliesMap ? Boolean(showRepliesMap[comment._id]) : Boolean(showReplies);
  const repliesLoading = loadingRepliesMap ? Boolean(loadingRepliesMap[comment._id]) : Boolean(loadingReplies);
  const replyCount = comment.replyCount || commentReplies.length || 0;
  const hasReplyThread = replyCount > 0 || repliesVisible;
  const isNested = isReply || depth > 0;
  const nextDepth = Math.min(depth + 1, maxDepth);
  const isAtVisualCap = depth + 1 >= maxDepth;
  const isLiked = comment.likes?.some((like) => idsMatch(like, user?._id));
  const isDisliked = comment.dislikes?.some((dislike) => idsMatch(dislike, user?._id));
  const canPin = isOwner && !isNested;
  const canDeleteAsOwner = user?._id && !idsMatch(user._id, authorId) && isOwner;
  const canEditOwnComment = user?._id && idsMatch(user._id, authorId);

  const content = useMemo(
    () => renderCommentText(comment.content, comment.replyTo),
    [comment.content, comment.replyTo]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReplySubmit = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply) return;

    await onReply(comment._id, trimmedReply, authorId);
    setReplyText('');
    setShowReplyInput(false);
  };

  const handleCancelEdit = () => {
    if (typeof onCancelEdit === 'function') {
      onCancelEdit();
    } else if (typeof onEdit === 'function') {
      onEdit(null, '');
    }

    if (typeof setEditText === 'function') {
      setEditText('');
    }
  };

  return (
    <article
      className={`nb-comment-item ${isNested ? 'nb-comment-item--nested' : ''} ${repliesVisible ? 'nb-comment-item--open' : ''} ${comment.isPinned ? 'nb-comment-item--pinned' : ''}`}
      data-depth={Math.min(depth, maxDepth)}
    >
      <div className="nb-comment-row">
        <div className="nb-comment-avatar">
          <Avatar user={author} size={isNested ? 'xs' : 'sm'} />
        </div>

        <div className="nb-comment-body">
          <div className="nb-comment-main">
            {comment.isPinned && (
              <BsPinAngleFill className="nb-comment-pin" aria-label="Pinned comment" />
            )}

            <div className="nb-comment-header">
              <Link to={`/user/${authorId}`} className="nb-comment-author">
                <span>{author?.username || 'User'}</span>
                {showAuthorBadge && postOwner?._id === authorId && (
                  <span className="nb-comment-author-badge">Author</span>
                )}
                {(author?.isGuest || author?.role === 'guest') ? (
                  <TbBrandAmongUs className="text-purple-500" size={14} title="Guest User" />
                ) : author?.isVerified ? (
                  <span className="nb-comment-verified" title="Verified">
                    <GoVerified size={9} />
                  </span>
                ) : null}
              </Link>
              <span className="nb-comment-time">{formatTimeAgo(comment.createdAt)}</span>
            </div>

            {editingComment === comment._id ? (
              <div className="nb-comment-edit">
                <textarea
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  className="nb-comment-textarea"
                  rows={2}
                />
                <div className="nb-comment-form-actions">
                  <button type="button" onClick={handleCancelEdit} className="nb-comment-soft-button">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveEdit(comment._id)}
                    className="nb-comment-primary-button"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="nb-comment-text">{content}</p>
            )}

            <div className="nb-comment-actions">
              <button
                type="button"
                onClick={() => onLike(comment._id)}
                className={`nb-comment-action ${isLiked ? 'nb-comment-action--active' : ''}`}
                aria-label="Like comment"
              >
                {isLiked ? <AiFillLike /> : <AiOutlineLike />}
                {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
              </button>

              <button
                type="button"
                onClick={() => onDislike(comment._id)}
                className={`nb-comment-action ${isDisliked ? 'nb-comment-action--active' : ''}`}
                aria-label="Dislike comment"
              >
                <AiOutlineDislike />
                {comment.dislikes?.length > 0 && <span>{comment.dislikes.length}</span>}
              </button>

              {(comment.isHearted || isOwner) && (
                <button
                  type="button"
                  onClick={isOwner ? () => onHeart(comment._id) : undefined}
                  className={`nb-comment-action ${comment.isHearted ? 'nb-comment-action--hearted' : ''}`}
                  aria-label={comment.isHearted ? 'Hearted by author' : 'Heart comment'}
                >
                  {comment.isHearted ? (
                    <span className="nb-comment-heart-mark">
                      <Avatar user={postOwner} size="xs" />
                      <FiHeart />
                    </span>
                  ) : (
                    <FiHeart />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowReplyInput((current) => !current)}
                className="nb-comment-action nb-comment-reply-button"
              >
                Reply
              </button>

              {(canPin || canEditOwnComment || canDeleteAsOwner) && (
                <div className="nb-comment-menu" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowMenu((current) => !current)}
                    className="nb-comment-menu-button"
                    aria-label="Comment actions"
                  >
                    <BiDotsVerticalRounded />
                  </button>
                  {showMenu && (
                    <div className="nb-comment-menu-popover">
                      {canPin && (
                        <button
                          type="button"
                          onClick={() => {
                            onPin(comment._id);
                            setShowMenu(false);
                          }}
                        >
                          {comment.isPinned ? <BsPinAngleFill /> : <BsPinAngle />}
                          {comment.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                      {canEditOwnComment && (
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(comment._id, comment.content);
                            setShowMenu(false);
                          }}
                        >
                          <MdEdit />
                          Edit
                        </button>
                      )}
                      {(canEditOwnComment || canDeleteAsOwner) && (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(comment._id);
                            setShowMenu(false);
                          }}
                          disabled={deletingComment === comment._id}
                          className="nb-comment-danger-button"
                        >
                          <MdDelete />
                          {deletingComment === comment._id
                            ? (canEditOwnComment ? 'Deleting...' : 'Removing...')
                            : (canEditOwnComment ? 'Delete' : 'Remove')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {showReplyInput && (
            <div className="nb-comment-reply-form">
              {user ? (
                <Avatar user={user} size="xs" />
              ) : (
                <div className="nb-comment-anonymous-avatar" aria-hidden="true" />
              )}
              <div className="nb-comment-reply-editor">
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder={`Reply to ${author.username || 'this comment'}...`}
                  className="nb-comment-textarea"
                  rows={2}
                />
                <div className="nb-comment-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowReplyInput(false)}
                    className="nb-comment-soft-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="nb-comment-primary-button"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {hasReplyThread && !repliesVisible && (
            <button
              type="button"
              onClick={() => onLoadReplies(comment._id)}
              className="nb-comment-toggle"
              disabled={repliesLoading}
            >
              {repliesVisible ? <HiArrowUp /> : <HiArrowDown />}
              {repliesLoading
                ? 'Loading replies...'
                : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {repliesVisible && (
            <div
              className={`nb-comment-replies ${isAtVisualCap ? 'nb-comment-replies--capped' : ''}`}
            >
              {repliesLoading ? (
                <div className="nb-comment-loading">
                  <span />
                </div>
              ) : (
                <>
                  {commentReplies.map((reply) => (
                    <div className="nb-comment-branch" key={reply._id}>
                      <EnhancedComment
                        comment={reply}
                        isOwner={isOwner}
                        onReply={onReply}
                        onLike={onLike}
                        onDislike={onDislike}
                        onHeart={onHeart}
                        onPin={onPin}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onSaveEdit={onSaveEdit}
                        onCancelEdit={onCancelEdit}
                        editingComment={editingComment}
                        editText={editText}
                        setEditText={setEditText}
                        onLoadReplies={onLoadReplies}
                        replyMap={replyMap}
                        showRepliesMap={showRepliesMap}
                        loadingRepliesMap={loadingRepliesMap}
                        isReply
                        deletingComment={deletingComment}
                        postOwner={postOwner}
                        showAuthorBadge={showAuthorBadge}
                        depth={nextDepth}
                        maxDepth={maxDepth}
                      />
                    </div>
                  ))}
                  <div className="nb-comment-branch nb-comment-toggle-branch">
                    <button
                      type="button"
                      onClick={() => onLoadReplies(comment._id)}
                      className="nb-comment-toggle"
                      disabled={repliesLoading}
                    >
                      <HiArrowUp />
                      Hide replies
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default EnhancedComment;
