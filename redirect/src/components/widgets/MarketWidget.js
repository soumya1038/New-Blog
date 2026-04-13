import React, { useState, useEffect } from 'react';
import { HiMiniArrowTrendingUp, HiMiniArrowTrendingDown } from 'react-icons/hi2';
import { TbChartLine } from 'react-icons/tb';

const MarketWidget = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = () => {
    setMarkets([
      { name: 'NIFTY 50', value: '21,456.30', change: '+125.40', percent: '+0.59%', isUp: true, high: '21,489.50', low: '21,320.10', open: '21,330.90', volume: '2.5B' },
      { name: 'SENSEX', value: '71,234.50', change: '+342.20', percent: '+0.48%', isUp: true, high: '71,456.80', low: '70,892.30', open: '70,892.30', volume: '4.8B' },
      { name: 'BSE', value: '71,234.50', change: '-89.30', percent: '-0.13%', isUp: false, high: '71,323.80', low: '71,145.20', open: '71,323.80', volume: '3.2B' },
      { name: 'NSE', value: '21,456.30', change: '+56.70', percent: '+0.26%', isUp: true, high: '21,512.90', low: '21,399.60', open: '21,399.60', volume: '1.9B' }
    ]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-4"></div>
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
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex items-center gap-2">
        <TbChartLine className="w-5 h-5 text-white" />
        <h3 className="text-sm font-semibold text-white">Market Indices</h3>
      </div>
      <div className="p-3 space-y-3">
        {markets.map((market, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{market.name}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{market.value}</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 text-xs font-semibold ${market.isUp ? 'text-green-600' : 'text-red-600'}`}>
                  {market.isUp ? <HiMiniArrowTrendingUp className="w-4 h-4" /> : <HiMiniArrowTrendingDown className="w-4 h-4" />}
                  <span>{market.change}</span>
                </div>
                <p className={`text-xs ${market.isUp ? 'text-green-600' : 'text-red-600'}`}>{market.percent}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
              <div><span className="block text-gray-500 dark:text-gray-500">Open</span><span className="font-semibold text-gray-800 dark:text-gray-200">{market.open}</span></div>
              <div><span className="block text-gray-500 dark:text-gray-500">High</span><span className="font-semibold text-gray-800 dark:text-gray-200">{market.high}</span></div>
              <div><span className="block text-gray-500 dark:text-gray-500">Low</span><span className="font-semibold text-gray-800 dark:text-gray-200">{market.low}</span></div>
              <div><span className="block text-gray-500 dark:text-gray-500">Vol</span><span className="font-semibold text-gray-800 dark:text-gray-200">{market.volume}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketWidget;
