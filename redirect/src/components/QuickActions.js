import React from 'react';
import { FaPlus, FaEye, FaShare, FaQrcode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ user, onShareProfile, onShowQR }) => {
  const navigate = useNavigate();

  const actions = [
    { icon: FaPlus, label: 'New Post', color: 'bg-blue-500 hover:bg-blue-600', onClick: () => navigate('/create-blog') },
    { icon: FaEye, label: 'Public View', color: 'bg-emerald-500 hover:bg-emerald-600', onClick: () => navigate(`/user/${user._id}`) },
    { icon: FaShare, label: 'Share', color: 'bg-purple-500 hover:bg-purple-600', onClick: onShareProfile },
    { icon: FaQrcode, label: 'QR Code', color: 'bg-indigo-500 hover:bg-indigo-600', onClick: onShowQR }
  ];

  return (
    <div className="theme-panel rounded-2xl shadow-sm p-5 border border-[var(--border-default)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={`${action.color} text-white p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all duration-200 hover:shadow-md active:scale-95`}
          >
            <action.icon size={20} />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
