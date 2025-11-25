import React, { useState } from 'react';
import api from '../services/api';
import { FaMagic, FaSpinner } from 'react-icons/fa';

const AIBlogGenerator = ({ title, tags, category, existingContent, onGenerate, onMetaGenerate, isShortMode }) => {
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
        isShortMode 
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
          setEditableTitle(title || '');
          setShowModal(true);
        }}
        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all text-sm font-semibold"
        type="button"
      >
        <span>✨</span>
        <span>Generate</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">✨ AI Content Generator</h3>
            {existingContent && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> AI will improve your existing content!
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Title</label>
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter blog title..."
              />
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                {tags && <p><strong>Tags:</strong> {tags}</p>}
                {category && <p><strong>Category:</strong> {category}</p>}
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {isShortMode ? (
                    <>
                      <option value="10-50">10-50 words</option>
                      <option value="50-100">50-100 words</option>
                      <option value="100-110">100-110 words</option>
                    </>
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
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><FaSpinner className="animate-spin" /> Generating...</> : <><FaMagic /> Generate</>}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
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
