import React, { useState } from 'react';
import { FaCheckCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const ProfileCompleteness = ({ user, profile }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const checks = [
    { label: 'Profile Image', completed: !!user?.profileImage },
    { label: 'Full Name', completed: !!profile?.fullName },
    { label: 'Bio', completed: !!profile?.bio && profile.bio.length > 10 },
    { label: 'Phone', completed: !!profile?.phone },
    { label: 'Social Links', completed: profile?.socialMedia?.length > 0 }
  ];

  const completedCount = checks.filter(c => c.completed).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const isComplete = percentage === 100;

  return (
    <div className={`bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 overflow-hidden transition-all duration-300 ${isComplete && !isExpanded ? 'p-3' : 'p-5'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <FaCheckCircle className="text-white" size={20} />
            </div>
          ) : (
            <div className="relative w-10 h-10">
              <svg className="transform -rotate-90 w-10 h-10">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-gray-200 dark:text-gray-700" />
                <circle 
                  cx="20" 
                  cy="20" 
                  r="16" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - percentage / 100)}`}
                  className="text-blue-500 transition-all duration-700"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                {percentage}%
              </span>
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {isComplete ? 'Profile Complete!' : 'Complete Your Profile'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isComplete ? 'All set! Looking great' : `${completedCount}/${checks.length} completed`}
            </p>
          </div>
        </div>
        {isExpanded ? <FaChevronUp className="text-gray-400" size={16} /> : <FaChevronDown className="text-gray-400" size={16} />}
      </div>

      {isExpanded && !isComplete && (
        <div className="mt-4 space-y-2">
          {checks.map((check, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
                check.completed 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {check.completed ? (
                <FaCheckCircle className="text-green-500 flex-shrink-0" size={16} />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
              )}
              <span className={check.completed ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileCompleteness;
