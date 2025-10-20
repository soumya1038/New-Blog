import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ErrorFallback = ({ error, resetError }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetError?.();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-5xl w-full">
        <img 
          src="/image/failed_to_load.png" 
          alt="Failed to Load" 
          className="w-full max-w-3xl h-auto mx-auto mb-4 object-contain"
        />
        <h1 className="text-5xl font-bold text-gray-800 mb-3">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6 text-lg">
          {t('Failed to load content. Please try again.')}
        </p>
        {error && (
          <p className="text-sm text-red-700 mb-6 bg-red-50 border border-red-200 p-3 rounded-lg">
            {error.message}
          </p>
        )}
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-800 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors shadow-md hover:shadow-lg"
          >
            {t('Reload Page')}
          </button>
          <button
            onClick={handleGoHome}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            {t('Go to Home')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
