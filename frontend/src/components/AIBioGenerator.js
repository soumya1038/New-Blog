import React, { useState } from 'react';
import api from '../services/api';
import { FaMagic, FaSpinner } from 'react-icons/fa';

const AIBioGenerator = ({ onGenerate }) => {
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [interests, setInterests] = useState('');
  const [style, setStyle] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim() || !profession.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-bio', { name, profession, interests, style });
      onGenerate(data.bio);
      setShowModal(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Bio generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm"
      >
        <FaMagic /> AI Generate Bio
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">AI Bio Generator</h3>
            
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="Your profession (e.g., Software Developer)"
              className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Interests (optional)"
              className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="creative">Creative</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading || !name.trim() || !profession.trim()}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><FaSpinner className="animate-spin" /> Generating...</> : <><FaMagic /> Generate</>}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
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

export default AIBioGenerator;
