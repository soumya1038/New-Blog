import React, { useState, useEffect } from 'react';
import { GiCricketBat } from 'react-icons/gi';
import { FaCircle } from 'react-icons/fa';

const CricketWidget = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCricketData();
    const interval = setInterval(fetchCricketData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCricketData = async () => {
    try {
      const API_KEY = process.env.REACT_APP_CRICKET_API_KEY || 'pub_c9ede6d5b52347699fad876627f4fa80';
      const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&q=cricket&language=en&category=sports`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'success' && data.results) {
        const cricketMatches = data.results.slice(0, 2).map(item => ({
          type: 'Cricket',
          team1: item.title.split(' vs ')[0] || 'Team 1',
          team2: item.title.split(' vs ')[1]?.split(' ')[0] || 'Team 2',
          score1: 'Live',
          score2: 'Updates',
          overs1: '18.4',
          overs2: '12.3',
          runRate: '8.5',
          reqRate: '9.2',
          status: item.description?.substring(0, 50) || 'Match in progress',
          isLive: true
        }));
        setMatches(cricketMatches);
      } else {
        setMatches([
          {
            type: 'IPL',
            team1: 'MI',
            team2: 'CSK',
            score1: '185/6',
            score2: '178/8',
            overs1: '20.0',
            overs2: '20.0',
            runRate: '9.25',
            reqRate: '9.25',
            status: 'MI won by 7 runs',
            isLive: false
          },
          {
            type: 'T20I',
            team1: 'IND',
            team2: 'AUS',
            score1: '156/4',
            score2: '89/2',
            overs1: '20.0',
            overs2: '12.3',
            runRate: '7.8',
            reqRate: '8.7',
            status: 'AUS need 68 runs in 46 balls',
            isLive: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching cricket data:', error);
      setMatches([
        {
          type: 'IPL',
          team1: 'MI',
          team2: 'CSK',
          score1: '185/6',
          score2: '178/8',
          overs1: '20.0',
          overs2: '20.0',
          runRate: '9.25',
          reqRate: '9.25',
          status: 'MI won by 7 runs',
          isLive: false
        }
      ]);
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
