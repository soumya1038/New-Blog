import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 py-8">
      <div className="text-center max-w-4xl w-full">
        <img 
          src="/image/not_found.png" 
          alt="Page Not Found" 
          className="w-full max-w-2xl h-auto mx-auto mb-6 object-contain"
        />
        <h1 className="text-6xl font-bold text-gray-800 mb-3">404</h1>
        <h2 className="text-3xl font-semibold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-gray-600 mb-8 text-lg">
          {t('The page you are looking for does not exist.')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
        >
          {t('Go to Home')}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
