import React, { useState, useEffect } from 'react';
import { IoGameController } from 'react-icons/io5';
import { FaFire, FaTrophy } from 'react-icons/fa';

const GamesWidget = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamesData();
  }, []);

  const fetchGamesData = async () => {
    setGames([
      { title: 'PMGC 2024 Finals', category: 'International Mobile', status: 'Live', desc: 'Prize pool $3M', source: 'https://www.pubgmobile.com/event/pmgc2024', icon: <FaFire className="w-4 h-4 text-red-500" /> },
      { title: 'BGMI Championship', category: 'Mobile Tournament', status: 'Live', desc: 'Top 16 teams competing', source: 'https://www.battlegroundsmobileindia.com', icon: <FaTrophy className="w-4 h-4 text-orange-500" /> },
      { title: 'Valorant Champions', category: 'PC Esports', status: 'Live', desc: 'International finals', source: 'https://valorantesports.com', icon: <FaTrophy className="w-4 h-4 text-yellow-500" /> },
      { title: 'CS:GO Major', category: 'International PC', status: 'Upcoming', desc: 'Next major event', source: 'https://www.counter-strike.net', icon: <FaTrophy className="w-4 h-4 text-blue-500" /> },
      { title: 'Dota 2 The International', category: 'International', status: 'Live', desc: 'Biggest prize pool', source: 'https://www.dota2.com/international', icon: <FaFire className="w-4 h-4 text-purple-500" /> },
      { title: 'Free Fire World Series', category: 'Mobile Esports', status: 'Ongoing', desc: 'Global championship', source: 'https://ff.garena.com', icon: <FaTrophy className="w-4 h-4 text-pink-500" /> },
      { title: 'League of Legends Worlds', category: 'PC Tournament', status: 'Ongoing', desc: 'World championship', source: 'https://lolesports.com', icon: <FaTrophy className="w-4 h-4 text-indigo-500" /> },
      { title: 'COD Mobile Championship', category: 'Mobile', status: 'Upcoming', desc: 'Regional qualifiers', source: 'https://www.callofduty.com/mobile', icon: <IoGameController className="w-4 h-4 text-green-500" /> }
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 flex items-center gap-2">
        <IoGameController className="w-5 h-5 text-white" />
        <h3 className="text-sm font-semibold text-white">Gaming & Esports</h3>
      </div>
      <div className="p-3 space-y-2">
        {games.map((game, index) => (
          <div key={index} onClick={() => window.open(game.source, '_blank')} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer border border-transparent hover:border-purple-300 dark:hover:border-purple-600">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {game.icon}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{game.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{game.category}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                game.status === 'Live' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                game.status === 'Upcoming' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              }`}>{game.status}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 ml-6">{game.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamesWidget;
