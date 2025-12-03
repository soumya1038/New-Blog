import React, { useState, useEffect } from 'react';
import { WiDaySunny, WiCloudy, WiRain, WiSnow } from 'react-icons/wi';
import { FaMapMarkerAlt } from 'react-icons/fa';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Delhi');

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      const API_KEY = process.env.REACT_APP_WEATHER_API_KEY || 'fd1d3e5c02c4aaebf6ca0cf49226de83';
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
              const response = await fetch(url);
              const data = await response.json();
              
              if (data.main) {
                setWeather({
                  city: data.name,
                  temp: Math.round(data.main.temp),
                  feelsLike: Math.round(data.main.feels_like),
                  condition: data.weather[0].main,
                  description: data.weather[0].description,
                  humidity: data.main.humidity,
                  pressure: data.main.pressure,
                  windSpeed: Math.round(data.wind.speed * 3.6),
                  visibility: Math.round(data.visibility / 1000),
                  sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                });
                setLoading(false);
              } else {
                setPlaceholderWeather();
              }
            } catch (error) {
              setPlaceholderWeather();
            }
          },
          () => {
            fetchDelhiWeather(API_KEY);
          }
        );
      } else {
        fetchDelhiWeather(API_KEY);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
      fetchDelhiWeather(process.env.REACT_APP_WEATHER_API_KEY || 'fd1d3e5c02c4aaebf6ca0cf49226de83');
    }
  };

  const fetchDelhiWeather = async (apiKey) => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=${apiKey}&units=metric`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.main) {
        setWeather({
          city: 'Delhi',
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          condition: data.weather[0].main,
          description: data.weather[0].description,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: Math.round(data.wind.speed * 3.6),
          visibility: Math.round(data.visibility / 1000),
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        setPlaceholderWeather();
      }
    } catch (error) {
      setPlaceholderWeather();
    }
    setLoading(false);
  };

  const setPlaceholderWeather = () => {
    setWeather({
      city: 'Delhi',
      temp: 28,
      feelsLike: 30,
      condition: 'Sunny',
      description: 'clear sky',
      humidity: 65,
      pressure: 1013,
      windSpeed: 12,
      visibility: 10,
      sunrise: '06:30 AM',
      sunset: '06:45 PM'
    });
    setLoading(false);
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Sunny': return <WiDaySunny className="w-16 h-16 text-yellow-400" />;
      case 'Cloudy': return <WiCloudy className="w-16 h-16 text-gray-400" />;
      case 'Rain': return <WiRain className="w-16 h-16 text-blue-400" />;
      case 'Snow': return <WiSnow className="w-16 h-16 text-blue-200" />;
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

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Weather</h3>
        <FaMapMarkerAlt className="w-4 h-4" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-3xl font-bold">{weather.temp}°C</p>
          <p className="text-xs opacity-75">Feels like {weather.feelsLike}°C</p>
          <p className="text-sm opacity-90 mt-1">{weather.city}</p>
          <p className="text-xs opacity-75 capitalize">{weather.description}</p>
        </div>
        {getWeatherIcon(weather.condition)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs opacity-90 border-t border-white/20 pt-3">
        <div><span className="opacity-75">Humidity:</span> <span className="font-semibold">{weather.humidity}%</span></div>
        <div><span className="opacity-75">Wind:</span> <span className="font-semibold">{weather.windSpeed} km/h</span></div>
        <div><span className="opacity-75">Pressure:</span> <span className="font-semibold">{weather.pressure} hPa</span></div>
        <div><span className="opacity-75">Visibility:</span> <span className="font-semibold">{weather.visibility} km</span></div>
        <div><span className="opacity-75">Sunrise:</span> <span className="font-semibold">{weather.sunrise}</span></div>
        <div><span className="opacity-75">Sunset:</span> <span className="font-semibold">{weather.sunset}</span></div>
      </div>
    </div>
  );
};

export default WeatherWidget;
