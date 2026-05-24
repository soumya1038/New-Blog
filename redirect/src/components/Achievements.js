import React, { useState } from 'react';
import { FaTrophy, FaStar, FaFire, FaHeart, FaUsers, FaPen, FaLock, FaCheckCircle, FaEye, FaComment, FaCalendarCheck, FaCrown, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const Achievements = ({ blogs, articles, shorts, user }) => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalPosts = blogs.length + articles.length + shorts.length;
  const totalLikes = [...blogs, ...articles, ...shorts].reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalComments = [...blogs, ...articles, ...shorts].reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  const totalViews = [...blogs, ...articles, ...shorts].reduce((sum, post) => sum + (post.views || 0), 0);
  const memberDays = Math.floor((new Date() - new Date(user?.createdAt)) / (1000 * 60 * 60 * 24));
  
  // Login streak calculation (mock - should come from backend)
  const loginStreak = user?.loginStreak || 0;
  const bestStreak = user?.bestLoginStreak || loginStreak;

  const achievements = [
    { 
      icon: FaPen, 
      title: 'First Steps', 
      story: 'Every great journey begins with a single word...', 
      unlocked: totalPosts >= 1, 
      color: 'from-blue-500 via-blue-600 to-cyan-600',
      glowColor: 'shadow-blue-500/50',
      current: totalPosts,
      milestones: [
        { label: 'Begin', value: 0, desc: 'Start writing' },
        { label: 'First Post', value: 1, desc: 'Your debut' },
        { label: 'Getting Started', value: 5, desc: 'Building momentum' },
        { label: 'Prolific', value: 10, desc: 'True writer' }
      ]
    },
    { 
      icon: FaFire, 
      title: 'Prolific Writer', 
      story: 'Words flow like a river from your creative mind...', 
      unlocked: totalPosts >= 10, 
      color: 'from-orange-500 via-red-500 to-pink-600',
      glowColor: 'shadow-orange-500/50',
      current: totalPosts,
      milestones: [
        { label: 'First Steps', value: 1, desc: 'Started' },
        { label: 'Prolific', value: 10, desc: 'Finding voice' },
        { label: 'Dedicated', value: 25, desc: 'Consistent' },
        { label: 'Legend', value: 50, desc: 'Master' }
      ]
    },
    { 
      icon: FaHeart, 
      title: 'Beloved Creator', 
      story: 'Your words touch hearts across the world...', 
      unlocked: totalLikes >= 50, 
      color: 'from-pink-400 via-rose-500 to-red-500 dark:from-pink-500 dark:via-rose-600 dark:to-red-600',
      glowColor: 'shadow-rose-500/50',
      current: totalLikes,
      milestones: [
        { label: 'First Like', value: 1, desc: 'Noticed' },
        { label: 'Beloved', value: 50, desc: 'Growing fans' },
        { label: 'Loved', value: 100, desc: 'Community favorite' },
        { label: 'Superstar', value: 500, desc: 'Viral' }
      ]
    },
    { 
      icon: FaStar, 
      title: 'Shining Star', 
      story: 'You shine bright in the constellation of creators...', 
      unlocked: totalLikes >= 100, 
      color: 'from-yellow-400 via-amber-500 to-orange-500 dark:from-yellow-500 dark:via-amber-600 dark:to-orange-600',
      glowColor: 'shadow-amber-500/50',
      current: totalLikes,
      milestones: [
        { label: 'Beloved', value: 50, desc: 'Rising' },
        { label: 'Star', value: 100, desc: 'Shining' },
        { label: 'Celebrity', value: 250, desc: 'Famous' },
        { label: 'Icon', value: 500, desc: 'Legendary' }
      ]
    },
    { 
      icon: FaCalendarCheck, 
      title: 'Daily Devotee', 
      story: 'Consistency is the key to greatness...', 
      unlocked: loginStreak >= 7, 
      color: 'from-emerald-400 via-green-500 to-teal-500 dark:from-emerald-500 dark:via-green-600 dark:to-teal-600',
      glowColor: 'shadow-teal-500/50',
      current: loginStreak,
      milestones: [
        { label: 'Start', value: 1, desc: 'Day 1' },
        { label: 'Week', value: 7, desc: '7 days' },
        { label: 'Month', value: 30, desc: '30 days' },
        { label: 'Champion', value: 100, desc: '100 days!' }
      ],
      extraInfo: `Best Streak: ${bestStreak} days 🔥`
    },
    { 
      icon: FaEye, 
      title: 'View Magnet', 
      story: 'Your content draws eyes like a magnet...', 
      unlocked: totalViews >= 100, 
      color: 'from-indigo-400 via-purple-500 to-violet-600 dark:from-indigo-500 dark:via-purple-600 dark:to-violet-700',
      glowColor: 'shadow-violet-500/50',
      current: totalViews,
      milestones: [
        { label: 'Seen', value: 10, desc: 'First views' },
        { label: 'Magnet', value: 100, desc: 'Attracting' },
        { label: 'Popular', value: 500, desc: 'Trending' },
        { label: 'Viral', value: 1000, desc: 'Explosive' }
      ]
    },
    { 
      icon: FaComment, 
      title: 'Conversation Starter', 
      story: 'Your posts spark meaningful discussions...', 
      unlocked: totalComments >= 20, 
      color: 'from-cyan-400 via-blue-500 to-indigo-600 dark:from-cyan-500 dark:via-blue-600 dark:to-indigo-700',
      glowColor: 'shadow-sky-500/50',
      current: totalComments,
      milestones: [
        { label: 'First', value: 1, desc: 'Replied' },
        { label: 'Starter', value: 20, desc: 'Engaging' },
        { label: 'Debater', value: 50, desc: 'Active' },
        { label: 'Influencer', value: 100, desc: 'Impactful' }
      ]
    },
    { 
      icon: FaUsers, 
      title: 'Veteran Member', 
      story: 'Time has woven you into our community fabric...', 
      unlocked: memberDays >= 30, 
      color: 'from-purple-500 via-violet-500 to-indigo-600',
      glowColor: 'shadow-purple-500/50',
      current: memberDays,
      milestones: [
        { label: 'Newcomer', value: 0, desc: 'Welcome' },
        { label: 'Veteran', value: 30, desc: '1 month' },
        { label: 'Committed', value: 90, desc: '3 months' },
        { label: 'Elder', value: 365, desc: '1 year' }
      ]
    },
    { 
      icon: FaTrophy, 
      title: 'Legendary Creator', 
      story: 'Your legacy is written in the annals of greatness...', 
      unlocked: totalPosts >= 50, 
      color: 'from-amber-400 via-orange-500 to-red-500 dark:from-amber-500 dark:via-orange-600 dark:to-red-600',
      glowColor: 'shadow-orange-500/50',
      current: totalPosts,
      milestones: [
        { label: 'Prolific', value: 10, desc: 'Consistent' },
        { label: 'Legend', value: 50, desc: 'Legendary' },
        { label: 'Epic', value: 75, desc: 'Epic' },
        { label: 'Master', value: 100, desc: 'Ultimate' }
      ]
    },
    { 
      icon: FaCrown, 
      title: 'Ultimate Master', 
      story: 'You have achieved the pinnacle of excellence...', 
      unlocked: totalPosts >= 100 && totalLikes >= 500 && memberDays >= 365, 
      color: 'from-yellow-300 via-amber-400 to-orange-500',
      glowColor: 'shadow-yellow-400/50',
      current: Math.min(totalPosts, totalLikes, memberDays),
      milestones: [
        { label: 'Journey', value: 0, desc: 'Beginning' },
        { label: 'Growth', value: 50, desc: 'Progressing' },
        { label: 'Excellence', value: 200, desc: 'Excelling' },
        { label: 'Master', value: 500, desc: 'Mastered!' }
      ],
      special: true
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const inProgressAchievements = achievements.filter((achievement) => {
    const lastMilestone = achievement.milestones[achievement.milestones.length - 1];
    return achievement.current < lastMilestone.value;
  });
  const previewAchievements = inProgressAchievements.slice(0, 2);
  const visibleAchievements = isExpanded
    ? achievements
    : (previewAchievements.length > 0 ? previewAchievements : achievements.slice(0, 2));

  return (
    <div className="theme-panel rounded-2xl shadow-sm p-5 border border-[var(--border-default)]">
      <div className="flex justify-between items-center mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left"
        >
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Achievements</h3>
          {isExpanded ? (
            <FaChevronUp className="text-[var(--text-secondary)]" size={14} />
          ) : (
            <FaChevronDown className="text-[var(--text-secondary)]" size={14} />
          )}
        </button>
        <span className="text-xs font-medium px-2.5 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      {!isExpanded && (
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Showing top 2 achievements currently in progress.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleAchievements.map((achievement, idx) => {
          const currentMilestone = achievement.milestones.findIndex(m => achievement.current < m.value);
          const activeIndex = currentMilestone === -1 ? achievement.milestones.length - 1 : Math.max(0, currentMilestone - 1);
          const nextIndex = Math.min(activeIndex + 1, achievement.milestones.length - 1);
          const progress = achievement.milestones[activeIndex] ? 
            ((achievement.current - achievement.milestones[activeIndex].value) / 
            (achievement.milestones[nextIndex].value - achievement.milestones[activeIndex].value)) * 100 : 0;
          
          const isCompleted = achievement.current >= achievement.milestones[achievement.milestones.length - 1].value;
          
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredCard(idx)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`relative p-5 rounded-2xl border transition-all duration-500 cursor-pointer ${
                achievement.unlocked
                  ? `bg-gradient-to-br ${achievement.color} border-transparent text-white shadow-xl ${achievement.glowColor} hover:shadow-2xl hover:scale-[1.02]`
                  : 'bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--brand-primary)]/40'
              } ${achievement.special ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}
            >
              {/* Completion Sparkle */}
              {isCompleted && achievement.unlocked && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <FaCrown className="text-white text-sm" />
                </div>
              )}

              {/* Unlock Animation Glow */}
              {achievement.unlocked && hoveredCard === idx && (
                <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
              )}
              
              {/* Header */}
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    achievement.unlocked ? 'bg-white/20' : 'bg-[var(--background-secondary)]'
                  }`}>
                    <achievement.icon className={`${
                      achievement.unlocked ? 'text-white' : 'text-[var(--text-muted)]'
                    }`} size={24} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${
                      achievement.unlocked ? 'text-white' : 'text-[var(--text-primary)]'
                    }`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-xs italic mt-0.5 ${
                      achievement.unlocked ? 'text-white/80' : 'text-[var(--text-secondary)]'
                    }`}>
                      {achievement.story}
                    </p>
                  </div>
                </div>
                {achievement.unlocked ? (
                  isCompleted ? (
                    <div className="flex flex-col items-center">
                      <FaCrown className="text-yellow-300 text-xl animate-bounce" />
                      <span className="text-[9px] text-white/90 font-bold mt-1">MASTERED</span>
                    </div>
                  ) : (
                    <FaCheckCircle className="text-white text-lg animate-bounce" />
                  )
                ) : (
                  <FaLock className="text-[var(--text-muted)] text-sm" />
                )}</div>

              {/* Progress Narrative */}
              <div className={`text-xs mb-3 font-medium ${
                achievement.unlocked ? 'text-white/90' : 'text-[var(--text-secondary)]'
              }`}>
                {isCompleted ? (
                  <span>👑 Mastered! You've reached the pinnacle!</span>
                ) : achievement.unlocked ? (
                  <span>🎉 Unlocked! Next: {achievement.milestones[nextIndex]?.label} ({achievement.milestones[nextIndex]?.value})</span>
                ) : (
                  <span>
                    {achievement.current === 0 ? (
                      `Start your journey to unlock!`
                    ) : (
                      `${achievement.current}/${achievement.milestones[nextIndex]?.value} - ${Math.round(progress)}% to ${achievement.milestones[nextIndex]?.label}!`
                    )}
                  </span>
                )}
              </div>

              {achievement.extraInfo && (
                <div className={`text-xs mb-3 font-semibold ${
                  achievement.unlocked ? 'text-white/80' : 'text-[var(--brand-primary)]'
                }`}>
                  {achievement.extraInfo}
                </div>
              )}

              {/* Visual Timeline */}
              <div className="relative">
                {/* Milestone Markers - Alternating Pattern */}
                <div className="flex justify-between items-start mb-2">
                  {achievement.milestones.map((milestone, mIdx) => {
                    const isAchieved = achievement.current >= milestone.value;
                    const isCurrent = mIdx === activeIndex || (mIdx === nextIndex && !isCompleted);
                    const isAlternate = mIdx % 2 === 1;
                    
                    return (
                      <div 
                        key={mIdx} 
                        className={`flex flex-col items-center transition-all duration-500 ${
                          hoveredCard === idx ? 'scale-110' : ''
                        } ${isAlternate ? 'flex-col-reverse' : ''}`}
                        style={{ width: `${100 / achievement.milestones.length}%` }}
                      >
                        {/* Milestone Label */}
                        <p className={`text-[10px] font-semibold ${isAlternate ? 'mb-1.5' : 'mt-1.5'} text-center transition-all duration-300 ${
                          isAchieved
                            ? achievement.unlocked
                              ? 'text-white'
                              : 'text-blue-600 dark:text-blue-400'
                            : isCurrent
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {milestone.label}
                        </p>
                        
                        {/* Milestone Dot */}
                        <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                          isAchieved 
                            ? achievement.unlocked
                              ? 'bg-white border-white shadow-lg'
                              : 'bg-gradient-to-br from-blue-500 to-purple-500 border-blue-500 shadow-md'
                            : isCurrent
                              ? 'bg-white border-gray-400 dark:border-gray-500 animate-pulse'
                              : 'bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600'
                        }`} />
                        
                        {/* Milestone Value */}
                        <p className={`text-[9px] ${isAlternate ? 'mb-0.5' : 'mt-0.5'} ${
                          achievement.unlocked ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {milestone.value}
                        </p>
                        
                        {/* Milestone Description (on hover) */}
                        {hoveredCard === idx && (
                          <p className={`text-[9px] ${isAlternate ? 'mb-1' : 'mt-1'} text-center italic transition-opacity duration-300 ${
                            achievement.unlocked ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {milestone.desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar Background */}
                <div className={`h-2 rounded-full ${
                  achievement.unlocked ? 'bg-white/20' : 'bg-[var(--background-secondary)]'
                }`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      achievement.unlocked 
                        ? 'bg-white/60' 
                        : isCompleted 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
