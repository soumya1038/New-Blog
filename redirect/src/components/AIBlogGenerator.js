import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FaMagic, FaSpinner, FaLightbulb } from 'react-icons/fa';

const AIBlogGenerator = ({ title, tags, category, existingContent, onGenerate, onMetaGenerate, isShortMode, isArticleMode, onUnauthorized }) => {
  const { user } = useContext(AuthContext);
  const [editableTitle, setEditableTitle] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    if (!editableTitle || !editableTitle.trim()) {
      alert('Please enter a title first!');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-blog', {
        title: editableTitle,
        tags,
        category,
        existingContent,
        tone,
        length,
        isShortMode,
        isArticleMode
      });
      onGenerate(data.content, data.metaDescription);

      if (onMetaGenerate && data.metaDescription) {
        onMetaGenerate(data.metaDescription);
      }

      setShowModal(false);
    } catch (error) {
      console.error('AI Error:', error);
      alert(error.response?.data?.message || 'AI generation failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          if (!user) {
            if (onUnauthorized) onUnauthorized();
            return;
          }
          setEditableTitle(title || '');
          setShowModal(true);
        }}
        className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
        style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
        type="button"
      >
        <FaMagic />
        <span>Generate</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="theme-modal-card rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="theme-modal-title text-2xl font-bold mb-4 flex items-center gap-2">
              <FaMagic style={{ color: 'var(--brand-primary)' }} /> AI Content Generator
            </h3>
            {existingContent && (
              <div className="mb-4 p-3 rounded-lg border" style={{ background: 'var(--tag-bg)', borderColor: 'var(--border-default)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="inline-flex items-center gap-2"><FaLightbulb className="text-amber-500" /> <strong>Tip:</strong> AI will improve your existing content!</span>
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="theme-modal-text block text-sm font-semibold mb-2">Title</label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="theme-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                placeholder="Enter blog title..."
              />
              <div className="theme-modal-muted text-xs mt-2 space-y-1">
                {tags && <p><strong>Tags:</strong> {tags}</p>}
                {category && <p><strong>Category:</strong> {category}</p>}
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="theme-modal-text block text-sm font-semibold mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="theme-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="theme-modal-text block text-sm font-semibold mb-2">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="theme-input w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {isShortMode ? (
                    <>
                      <option value="10-50">10-50 words</option>
                      <option value="50-100">50-100 words</option>
                      <option value="100-110">100-110 words</option>
                    </>
                  ) : isArticleMode ? (
                    <option value="article">Article (1000-1500 words)</option>
                  ) : (
                    <>
                      <option value="10-50">10-50 words</option>
                      <option value="50-100">50-100 words</option>
                      <option value="100-110">100-110 words</option>
                      <option value="short">Short (300-500 words)</option>
                      <option value="medium">Medium (500-800 words)</option>
                      <option value="long">Long (800-1200 words)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !editableTitle}
                className="flex-1 text-white py-3 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' }}
              >
                {loading ? <><FaSpinner className="animate-spin" /> Generating...</> : <><FaMagic /> Generate</>}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 theme-soft-button rounded-lg"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIBlogGenerator;