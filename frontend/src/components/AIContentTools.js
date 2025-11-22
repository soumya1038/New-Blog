import React, { useState } from 'react';
import api from '../services/api';
import { FaLightbulb, FaTags, FaSpinner } from 'react-icons/fa';

const AIContentTools = ({ content, isShortMode = false, onTitlesGenerated, onTagsGenerated, onContentImproved }) => {
  const [loading, setLoading] = useState(false);

  const generateTitles = async () => {
    if (!content.trim()) return alert('Please enter some content first');
    
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-titles', { topic: content.substring(0, 200) });
      onTitlesGenerated(data.titles);
    } catch (error) {
      alert('Title generation failed');
    } finally {
      setLoading(false);
    }
  };

  const generateTags = async () => {
    if (!content.trim()) return alert('Please enter some content first');
    
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-tags', { content });
      onTagsGenerated(data.tags);
    } catch (error) {
      alert('Tag generation failed');
    } finally {
      setLoading(false);
    }
  };

  const improveContent = async (type) => {
    if (!content.trim()) return alert('Please enter some content first');
    
    setLoading(true);
    try {
      const { data } = await api.post('/ai/improve-content', { 
        content, 
        improvementType: type,
        isShortMode 
      });
      onContentImproved(data.improvedContent);
    } catch (error) {
      alert('Content improvement failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={generateTitles}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 text-sm"
      >
        {loading ? <FaSpinner className="animate-spin" /> : <FaLightbulb />}
        Title Ideas
      </button>

      <button
        onClick={generateTags}
        disabled={loading}
        className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 disabled:opacity-50 text-sm"
      >
        {loading ? <FaSpinner className="animate-spin" /> : <FaTags />}
        Generate Tags
      </button>

      <select
        onChange={(e) => e.target.value && improveContent(e.target.value)}
        disabled={loading}
        className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        value=""
      >
        <option value="">Improve Content...</option>
        <option value="grammar">Fix Grammar</option>
        <option value="clarity">Improve Clarity</option>
        <option value="professional">Make Professional</option>
        <option value="engaging">Make Engaging</option>
        <option value="concise">Make Concise</option>
      </select>
    </div>
  );
};

export default AIContentTools;
