import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { FiUsers, FiCheck } from 'react-icons/fi';

const JoinGroup = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/join-group/${inviteCode}`);
      return;
    }
    loadGroupInfo();
  }, [user, inviteCode]);

  const loadGroupInfo = async () => {
    try {
      const { data } = await api.get(`/groups`);
      const foundGroup = data.groups.find(g => g.inviteCode === inviteCode);
      
      if (foundGroup) {
        setGroup(foundGroup);
      } else {
        setError('Invalid or expired invite link');
      }
    } catch (err) {
      setError('Failed to load group information');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    setJoining(true);
    try {
      await api.post(`/groups/join/${inviteCode}`);
      setSuccess(true);
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUsers className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/chat')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Chat
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
          <p className="text-gray-600 mb-4">You've joined {group?.name}</p>
          <p className="text-sm text-gray-500">Redirecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <img
            src={group?.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || 'Group')}&background=0D8ABC&color=fff`}
            alt={group?.name}
            className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{group?.name}</h2>
          {group?.description && (
            <p className="text-gray-600 mb-2">{group.description}</p>
          )}
          <p className="text-sm text-gray-500">{group?.members?.length || 0} members</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleJoinGroup}
          disabled={joining}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Joining...
            </>
          ) : (
            <>
              <FiUsers className="w-5 h-5" />
              Join Group
            </>
          )}
        </button>

        <button
          onClick={() => navigate('/chat')}
          className="w-full mt-3 px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default JoinGroup;
