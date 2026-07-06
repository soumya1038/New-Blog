import React from 'react';
import { FaPlus, FaEye, FaShare, FaQrcode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ user, onShareProfile, onShowQR }) => {
  const navigate = useNavigate();

  const actions = [
    { icon: FaPlus, label: 'New Post', onClick: () => navigate('/create-blog') },
    { icon: FaEye, label: 'Public View', onClick: () => navigate(`/user/${user._id}`) },
    { icon: FaShare, label: 'Share', onClick: onShareProfile },
    { icon: FaQrcode, label: 'QR Code', onClick: onShowQR }
  ];

  return (
    <div className="theme-panel rounded-2xl shadow-sm p-4 border border-[var(--border-default)]">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className="theme-soft-button rounded-lg px-2.5 py-2 inline-flex items-center justify-center gap-1.5 text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--brand-primary)] active:scale-95"
          >
            <action.icon size={13} className="text-[var(--brand-primary)]" />
            <span className="text-[11px] font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
