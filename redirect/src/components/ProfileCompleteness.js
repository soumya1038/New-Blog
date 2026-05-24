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
    <div className={`theme-panel rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden transition-all duration-300 ${isComplete && !isExpanded ? 'p-3' : 'p-5'}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <FaCheckCircle className="text-white" size={20} />
            </div>
          ) : (
            <div className="relative w-10 h-10">
              <svg className="transform -rotate-90 w-10 h-10">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-[var(--border-default)]" />
                <circle 
                  cx="20" 
                  cy="20" 
                  r="16" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - percentage / 100)}`}
                  className="text-[var(--brand-primary)] transition-all duration-700"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                {percentage}%
              </span>
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {isComplete ? 'Profile Complete!' : 'Complete Your Profile'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {isComplete ? 'All set! Looking great' : `${completedCount}/${checks.length} completed`}
            </p>
          </div>
        </div>
        {isExpanded ? <FaChevronUp className="text-[var(--text-secondary)]" size={16} /> : <FaChevronDown className="text-[var(--text-secondary)]" size={16} />}
      </div>

      {isExpanded && !isComplete && (
        <div className="mt-4 space-y-2">
          {checks.map((check, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
                check.completed 
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-[var(--background-secondary)] border border-[var(--border-default)] hover:brightness-95 dark:hover:brightness-110'
              }`}
            >
              {check.completed ? (
                <FaCheckCircle className="text-emerald-400 flex-shrink-0" size={16} />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-[var(--border-default)] flex-shrink-0" />
              )}
              <span className={check.completed ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}>
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
