import React, { useState, useEffect } from 'react';
import { WiDaySunny, WiCloudy, WiRain, WiSnow } from 'react-icons/wi';
import { FaMapMarkerAlt } from 'react-icons/fa';
import api from '../../services/api';

const formatWeatherTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatMetric = (value, suffix = '') =>
  value === null || value === undefined || value === '' ? '-' : `${value}${suffix}`;

const roundCoordinate = (value) => Math.round(Number(value) * 100) / 100;

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeatherLocation = async (params) => {
    try {
      const { data } = await api.get('/widgets/weather', { params });

      if (data?.success && data.weather) {
        setWeather(data.weather);
      } else {
        setError('Weather unavailable');
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError('Weather unavailable');
    } finally {
      setLoading(false);
    }
  };

  const fetchDelhiWeather = () => fetchWeatherLocation({ city: 'Delhi' });

  const fetchWeather = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherLocation({
              lat: roundCoordinate(latitude),
              lon: roundCoordinate(longitude)
            });
          },
          () => fetchDelhiWeather()
        );
      } else {
        fetchDelhiWeather();
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError('Weather unavailable');
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition) => {
    switch (String(condition || '').toLowerCase()) {
      case 'clear':
      case 'sunny': return <WiDaySunny className="w-16 h-16 text-yellow-400" />;
      case 'clouds':
      case 'cloudy': return <WiCloudy className="w-16 h-16 text-gray-400" />;
      case 'rain':
      case 'drizzle':
      case 'thunderstorm': return <WiRain className="w-16 h-16 text-blue-400" />;
      case 'snow': return <WiSnow className="w-16 h-16 text-blue-200" />;
      default: return <WiDaySunny className="w-16 h-16 text-yellow-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-4"></div>
          <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Weather</h3>
          <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error || 'Weather unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Weather</h3>
        <FaMapMarkerAlt className="w-4 h-4" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-3xl font-bold">{weather.temp}&deg;C</p>
          <p className="text-xs opacity-75">Feels like {weather.feelsLike}&deg;C</p>
          <p className="text-sm opacity-90 mt-1">{weather.city}</p>
          <p className="text-xs opacity-75 capitalize">{weather.description}</p>
        </div>
        {getWeatherIcon(weather.condition)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs opacity-90 border-t border-white/20 pt-3">
        <div><span className="opacity-75">Humidity:</span> <span className="font-semibold">{formatMetric(weather.humidity, '%')}</span></div>
        <div><span className="opacity-75">Wind:</span> <span className="font-semibold">{formatMetric(weather.windSpeed, ' km/h')}</span></div>
        <div><span className="opacity-75">Pressure:</span> <span className="font-semibold">{formatMetric(weather.pressure, ' hPa')}</span></div>
        <div><span className="opacity-75">Visibility:</span> <span className="font-semibold">{formatMetric(weather.visibility, ' km')}</span></div>
        <div><span className="opacity-75">Sunrise:</span> <span className="font-semibold">{formatWeatherTime(weather.sunrise)}</span></div>
        <div><span className="opacity-75">Sunset:</span> <span className="font-semibold">{formatWeatherTime(weather.sunset)}</span></div>
      </div>
    </div>
  );
};

export default WeatherWidget;
