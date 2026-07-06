import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaBookmark,
  FaBoxOpen,
  FaCog,
  FaEdit,
  FaFileAlt,
  FaLock,
  FaRegFileAlt,
  FaShoppingBag,
  FaStickyNote,
  FaUserShield,
} from 'react-icons/fa';
import { GoVerified } from 'react-icons/go';
import { ScaleLoader } from 'react-spinners';
import Avatar from '../components/Avatar';
import GuestBadge from '../components/GuestBadge';
import useCurrentProfileSummary, { formatCompactCount } from '../hooks/useCurrentProfileSummary';

const getProfileRole = (user = {}) => {
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'coAdmin') return 'Co-admin';
  if (user.isSeller || user.role === 'seller') return 'Seller';
  if (user.isGuest || user.role === 'guest') return 'Guest';
  return 'Writer';
};

const getContentPath = (item = {}) => {
  const id = item.slug || item._id || item.id;
  if (!id) return '/home';
  if (item.contentType === 'article' || item.isArticle) return `/article/${id}`;
  if (item.contentType === 'short' || item.isShortBlog) return `/shorts/${item._id || item.id || id}`;
  return `/blog/${id}`;
};

const getContentImage = (item = {}) =>
  item.coverImage || item.thumbnail || item.image || item.transparentThumbnail || '';

const getCoverImage = (content = []) => {
  const visualItem = content.find((item) => getContentImage(item));
  return getContentImage(visualItem) || '/image/article_logo_light.png';
};

const StatPill = ({ value, label }) => (
  <div className="min-w-0 text-center">
    <p className="text-lg font-black leading-none text-[var(--text-primary)]">{formatCompactCount(value)}</p>
    <p className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">{label}</p>
  </div>
);

const Shortcut = ({ to, icon: Icon, label, value }) => (
  <Link
    to={to}
    className="flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-center text-[var(--text-primary)] shadow-sm transition active:scale-[0.98]"
  >
    <Icon className="text-[var(--brand-primary)]" />
    <span className="text-[11px] font-bold leading-tight">{label}</span>
    {value !== undefined && (
      <span className="rounded-full bg-[var(--background-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
        {formatCompactCount(value)}
      </span>
    )}
  </Link>
);

const SecurityRow = ({ to, icon: Icon, label, value }) => (
  <Link
    to={to}
    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3 text-[var(--text-primary)]"
  >
    <span className="inline-flex items-center gap-3 text-sm font-semibold">
      <Icon className="text-[var(--brand-primary)]" />
      {label}
    </span>
    <span className="text-xs font-semibold text-[var(--text-secondary)]">{value}</span>
  </Link>
);

const ProfileOverviewMobile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    displayUser,
    publishedContent,
    stats,
    twoFactorStatus,
    loading,
    error,
  } = useCurrentProfileSummary();

  const displayUserId = displayUser?._id || displayUser?.id;
  const recentContent = publishedContent.slice(0, 3);
  const coverImage = getCoverImage(publishedContent);
  const roleLabel = getProfileRole(displayUser);
  const firstLink = Array.isArray(displayUser?.socialMedia) ? displayUser.socialMedia[0] : null;
  const bioText = displayUser?.bio || t('Add a short bio so readers know what you write about.');
  const memberSince = displayUser?.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen theme-page-bg flex items-center justify-center">
        <ScaleLoader color="var(--brand-primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen theme-page-bg px-4 py-8 text-center">
        <p className="text-sm font-semibold text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen theme-page-bg px-4 py-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
            aria-label={t('Back')}
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-base font-black text-[var(--text-primary)]">{t('Profile')}</h1>
          <Link
            to="/profile/settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm"
            aria-label={t('Profile settings')}
          >
            <FaCog />
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-sm">
          <div
            className="h-28 bg-[var(--background-secondary)] bg-cover bg-center"
            style={{ backgroundImage: `url("${coverImage}")` }}
            aria-hidden="true"
          />
          <div className="-mt-12 px-5 pb-5 text-center">
            <div className="inline-flex rounded-full border-4 border-[var(--surface-card)] bg-[var(--surface-card)]">
              <Avatar user={displayUser} size="xl" />
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-black text-[var(--text-primary)]">
                {displayUser?.fullName || displayUser?.username || t('Your profile')}
              </h2>
              {displayUser?.isVerified ? <GoVerified className="text-blue-500" /> : null}
              {(displayUser?.isGuest || displayUser?.role === 'guest') ? <GuestBadge size="sm" /> : null}
            </div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              @{displayUser?.username || 'writer'}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-[var(--background-secondary)] px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
              {t(roleLabel)}
            </span>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-3">
              <StatPill value={stats.posts} label={t('Posts')} />
              <StatPill value={stats.followers} label={t('Followers')} />
              <StatPill value={stats.following} label={t('Following')} />
            </div>

            <p
              className="mt-4 overflow-hidden text-sm leading-6 text-[var(--text-secondary)]"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 4,
              }}
            >
              {bioText}
            </p>

            <div className="mt-3 space-y-1 text-left text-xs text-[var(--text-secondary)]">
              {firstLink?.url ? (
                <a href={firstLink.url} target="_blank" rel="noreferrer" className="block truncate text-[var(--brand-primary)]">
                  {firstLink.url}
                </a>
              ) : null}
              {memberSince ? <p>{t('Joined')} {memberSince}</p> : null}
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <Link
                to="/profile/settings?section=edit&target=edit"
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"
              >
                {t('Edit Profile')}
              </Link>
              <Link
                to="/profile/settings"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] text-[var(--text-primary)]"
                aria-label={t('Settings')}
              >
                <FaCog />
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-black text-[var(--text-primary)]">{t('My shortcuts')}</h3>
          <div className="grid grid-cols-4 gap-2">
            <Shortcut to={displayUserId ? `/user/${displayUserId}` : '/profile'} icon={FaRegFileAlt} label={t('My Posts')} value={stats.posts} />
            <Shortcut to="/drafts" icon={FaStickyNote} label={t('Drafts')} value={stats.drafts} />
            <Shortcut to="/marketplace" icon={FaBookmark} label={t('Saved')} value={stats.saved} />
            <Shortcut to="/my-orders" icon={FaShoppingBag} label={t('Orders')} value={stats.orders} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[var(--text-primary)]">{t('Recent activity')}</h3>
            {displayUserId ? (
              <Link to={`/user/${displayUserId}`} className="text-xs font-bold text-[var(--brand-primary)]">
                {t('View all')}
              </Link>
            ) : null}
          </div>
          {recentContent.length > 0 ? (
            <div className="space-y-2">
              {recentContent.map((item) => (
                <Link
                  key={`${item.contentType}-${item._id || item.id}`}
                  to={getContentPath(item)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 text-[var(--text-primary)]"
                >
                  {getContentImage(item) ? (
                    <img src={getContentImage(item)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--background-secondary)] text-[var(--brand-primary)]">
                      <FaFileAlt />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{item.title || t('Untitled')}</span>
                    <span className="block text-xs capitalize text-[var(--text-secondary)]">{item.contentType}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{t('No published activity yet.')}</p>
            </div>
          )}
        </section>

        <section className="space-y-2 pb-4">
          <h3 className="text-sm font-black text-[var(--text-primary)]">{t('Security')}</h3>
          <SecurityRow to="/profile/settings?section=privacy&target=privacy" icon={FaLock} label={t('Privacy')} value={displayUser?.privacy?.profileVisibility || 'public'} />
          <SecurityRow to="/profile/manage?target=security" icon={FaUserShield} label={t('Account tools')} value={twoFactorStatus?.enabled ? t('2FA on') : t('Manage')} />
          <SecurityRow to="/profile/settings?section=edit&target=edit" icon={FaEdit} label={t('Profile details')} value={t('Edit')} />
          <SecurityRow to="/profile/settings?target=preferences" icon={FaBoxOpen} label={t('Preferences')} value={t('Open')} />
        </section>
      </div>
    </main>
  );
};

export default ProfileOverviewMobile;
