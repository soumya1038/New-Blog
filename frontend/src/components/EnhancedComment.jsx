import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineLike, AiFillLike } from 'react-icons/ai';
import { FiHeart } from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import { HiArrowUp, HiArrowDown } from 'react-icons/hi';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import { MdEdit, MdDelete } from 'react-icons/md';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../services/api';

const EnhancedComment = ({ 
  comment, 
  isOwner, 
  onReply, 
  onLike, 
  onHeart, 
  onPin, 
  onDelete,
  onEdit,
  onSaveEdit,
  editingComment,
  editText,
  setEditText,
  onLoadReplies,
  replies = [],
  showReplies = false,
  loadingReplies = false,
  isReply = false,
  deletingComment,
  postOwner
}) => {
  const { user } = useContext(AuthContext);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

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
    if (replyText.trim()) {
      const parentId = comment.parentComment || comment._id;
      await onReply(parentId, replyText, comment.author._id);
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const formatReplyContent = (content, replyToUser) => {
    if (replyToUser && content.startsWith(`@${replyToUser.username}`)) {
      return content;
    }
    return replyToUser ? `@${replyToUser.username} ${content}` : content;
  };

  return (
    <div className={`${comment.isPinned ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3' : ''}`}>
      <div className="flex gap-3">
        <Avatar user={comment.author} size="sm" />
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 relative">
            {comment.isPinned && (
              <BsPinAngleFill className="absolute -top-1 -right-1 w-4 h-4 text-blue-600" />
            )}
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link 
                  to={`/user/${comment.author._id}`}
                  className="font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {comment.author?.username}
                </Link>
                {editingComment === comment._id ? (
                  <div className="mt-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onSaveEdit(comment._id)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingComment(null)}
                        className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {comment.replyTo ? (
                      <>
                        <span className="text-blue-600 font-medium">@{comment.replyTo.username}</span>{' '}
                        {comment.content.replace(`@${comment.replyTo.username}`, '').trim()}
                      </>
                    ) : (
                      comment.content
                    )}
                  </p>
                )}
              </div>
              
              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <BiDotsVerticalRounded className="w-4 h-4 text-gray-500" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-32">
                    {isOwner && !isReply && (
                      <button
                        onClick={() => { onPin(comment._id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        {comment.isPinned ? <BsPinAngleFill className="w-3 h-3" /> : <BsPinAngle className="w-3 h-3" />}
                        {comment.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                    {user?._id === comment.author._id && (
                      <>
                        <button 
                          onClick={() => {
                            onEdit(comment._id, comment.content);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <MdEdit className="w-3 h-3" /> Edit
                        </button>
                        <button 
                          onClick={() => { onDelete(comment._id); setShowMenu(false); }}
                          disabled={deletingComment === comment._id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 disabled:opacity-50"
                        >
                          <MdDelete className="w-3 h-3" /> 
                          {deletingComment === comment._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                    {user?._id !== comment.author._id && isOwner && (
                      <button 
                        onClick={() => { onDelete(comment._id); setShowMenu(false); }}
                        disabled={deletingComment === comment._id}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 disabled:opacity-50"
                      >
                        <MdDelete className="w-3 h-3" /> 
                        {deletingComment === comment._id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <button 
              onClick={() => onLike(comment._id)}
              className="flex items-center gap-1 hover:text-blue-600"
            >
              {comment.likes?.includes(user?._id) ? (
                <AiFillLike className="w-4 h-4 text-blue-600" />
              ) : (
                <AiOutlineLike className="w-4 h-4" />
              )}
              {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
            </button>
            
            {(comment.isHearted || isOwner) && (
              <button
                onClick={isOwner ? () => onHeart(comment._id) : undefined}
                className={`relative flex items-center ${
                  isOwner ? 'hover:text-red-600 cursor-pointer' : 'cursor-default'
                } ${
                  comment.isHearted ? 'text-red-500' : ''
                }`}
              >
                {comment.isHearted ? (
                  <div className="relative flex items-center">
                    <Avatar user={postOwner} size="xs" className="w-5 h-5" />
                    <FiHeart className="absolute -bottom-1 -right-1 w-3 h-3 text-red-500 fill-current bg-white rounded-full" />
                  </div>
                ) : (
                  <FiHeart className="w-4 h-4" />
                )}
              </button>
            )}
            
            <button 
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="hover:text-blue-600"
            >
              Reply
            </button>
            
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          
          {!isReply && comment.replyCount > 0 && (
            <button
              onClick={() => onLoadReplies(comment._id)}
              className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              {showReplies ? (
                <HiArrowUp className="w-4 h-4" />
              ) : (
                <HiArrowDown className="w-4 h-4" />
              )}
              {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
          
          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <Avatar user={user} size="xs" className="w-full h-full" />
              </div>
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author.username}...`}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowReplyInput(false)}
                    className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {showReplies && (
            <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              {loadingReplies ? (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                replies.map((reply) => (
                  <EnhancedComment
                    key={reply._id}
                    comment={reply}
                    isOwner={isOwner}
                    onReply={onReply}
                    onLike={onLike}
                    onHeart={onHeart}
                    onPin={onPin}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onSaveEdit={onSaveEdit}
                    editingComment={editingComment}
                    editText={editText}
                    setEditText={setEditText}
                    isReply={true}
                    deletingComment={deletingComment}
                    postOwner={postOwner}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedComment;