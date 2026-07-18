import React, { useState, useEffect } from 'react';
import { GiCricketBat } from 'react-icons/gi';
import { FaCircle } from 'react-icons/fa';
import api from '../../services/api';

const CricketWidget = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCricketData();
    const interval = setInterval(fetchCricketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCricketData = async () => {
    try {
      const { data } = await api.get('/widgets/cricket');
      
      if (data?.success && Array.isArray(data.matches)) {
        setMatches(data.matches);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching cricket data:', error);
      setMatches([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex items-center gap-2">
          <GiCricketBat className="w-5 h-5 text-white" />
          <h3 className="text-sm font-semibold text-white">Cricket Scores</h3>
        </div>
        <div className="p-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Cricket updates unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex items-center gap-2">
        <GiCricketBat className="w-5 h-5 text-white" />
        <h3 className="text-sm font-semibold text-white">Cricket Scores</h3>
      </div>
      <div className="p-3 space-y-3">
        {matches.map((match, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{match.type}</span>
              {match.isLive && (
                <div className="flex items-center gap-1">
                  <FaCircle className="w-2 h-2 text-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-500">LIVE</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{match.team1}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{match.score1}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({match.overs1})</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{match.team2}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{match.score2}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({match.overs2})</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span>CRR: <span className="font-semibold">{match.runRate}</span></span>
              <span>RRR: <span className="font-semibold">{match.reqRate}</span></span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{match.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CricketWidget;
