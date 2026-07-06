import React from 'react';

// Base shimmer animation
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/35 dark:before:via-white/10 before:to-transparent";
const blockBase = "rounded-md bg-[var(--background-secondary)] border border-[var(--border-default)]";

const SkeletonBlock = ({ className = '' }) => (
  <div className={`${blockBase} ${className} ${shimmer}`.trim()} />
);

const BlogSkeletonBlock = ({ className = '' }) => (
  <div className={`blog-detail-skeleton-block ${className} ${shimmer}`.trim()} />
);

// Blog Card Skeleton
export const BlogCardSkeleton = () => (
  <div className="theme-panel rounded-xl shadow-lg overflow-hidden p-6 border border-[var(--border-default)]">
    <SkeletonBlock className="h-6 w-3/4 mb-4" />
    <div className="flex items-center gap-2 mb-4">
      <SkeletonBlock className="w-8 h-8 rounded-full" />
      <SkeletonBlock className="h-4 w-24" />
    </div>
    <SkeletonBlock className="h-4 w-full mb-2" />
    <SkeletonBlock className="h-4 w-5/6 mb-2" />
    <SkeletonBlock className="h-4 w-4/6 mb-4" />
    <div className="flex gap-4">
      <SkeletonBlock className="h-4 w-16" />
      <SkeletonBlock className="h-4 w-20" />
    </div>
  </div>
);

// Home Page Skeleton
export const HomePageSkeleton = () => (
  <div style={{ minHeight: '100vh', background: 'var(--background-primary)', paddingTop: '80px', paddingBottom: '60px' }}>
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
      {/* Search bar skeleton */}
      <div style={{ marginBottom: '40px', maxWidth: '600px' }}>
        <SkeletonBlock className="h-[48px] w-full rounded-lg" />
      </div>

      {/* Filter buttons skeleton */}
      <div className="flex flex-wrap gap-3 mb-12">
        {[...Array(4)].map((_, idx) => (
          <SkeletonBlock key={idx} className="h-[40px] w-[94px] rounded-md" />
        ))}
      </div>

      {/* Content sections skeleton */}
      {[...Array(2)].map((_, sectionIdx) => (
        <section key={sectionIdx} style={{ marginBottom: '60px' }}>
          <div className="flex items-center justify-between mb-5">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <BlogCardSkeleton key={`${sectionIdx}-${i}`} />
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

// Blog Detail Skeleton
export const BlogDetailSkeleton = () => (
  <div className="blog-detail-layout blog-detail-skeleton-layout" role="status" aria-live="polite" aria-label="Loading blog detail">
    <aside className="blog-detail-engagement-rail blog-detail-skeleton-rail" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <BlogSkeletonBlock key={`blog-skeleton-rail-${item}`} />
      ))}
    </aside>

    <main className="blog-detail-reader-panel">
      <article className="blog-detail-reader-card blog-detail-skeleton-card" aria-hidden="true">
        <BlogSkeletonBlock className="blog-detail-skeleton-back" />
        <BlogSkeletonBlock className="blog-detail-skeleton-kicker" />
        <BlogSkeletonBlock className="blog-detail-skeleton-title is-wide" />
        <BlogSkeletonBlock className="blog-detail-skeleton-title is-medium" />
        <BlogSkeletonBlock className="blog-detail-skeleton-title is-short" />
        <BlogSkeletonBlock className="blog-detail-skeleton-rule" />
        <BlogSkeletonBlock className="blog-detail-skeleton-deck is-wide" />
        <BlogSkeletonBlock className="blog-detail-skeleton-deck" />

        <div className="blog-detail-skeleton-meta">
          <BlogSkeletonBlock className="blog-detail-skeleton-avatar" />
          <BlogSkeletonBlock />
          <BlogSkeletonBlock />
          <BlogSkeletonBlock />
        </div>

        <div className="blog-detail-skeleton-tags">
          {[0, 1, 2, 3].map((item) => (
            <BlogSkeletonBlock key={`blog-skeleton-tag-${item}`} />
          ))}
        </div>

        <BlogSkeletonBlock className="blog-detail-skeleton-gallery" />

        <div className="blog-detail-action-strip blog-detail-skeleton-actions">
          {[0, 1, 2, 3, 4].map((item) => (
            <BlogSkeletonBlock key={`blog-skeleton-action-${item}`} />
          ))}
        </div>

        <section className="blog-detail-body-frame blog-detail-skeleton-body">
          <div className="blog-detail-skeleton-audio">
            <BlogSkeletonBlock className="blog-detail-skeleton-audio-play" />
            <BlogSkeletonBlock className="blog-detail-skeleton-audio-icon" />
            <BlogSkeletonBlock className="blog-detail-skeleton-audio-range" />
            <BlogSkeletonBlock className="blog-detail-skeleton-audio-summary" />
          </div>
          <div className="blog-detail-skeleton-copy">
            <BlogSkeletonBlock className="is-dropcap" />
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <BlogSkeletonBlock
                key={`blog-skeleton-line-${item}`}
                className={item === 5 ? 'is-short' : item === 2 ? 'is-medium' : ''}
              />
            ))}
          </div>
          <BlogSkeletonBlock className="blog-detail-skeleton-subhead" />
          <div className="blog-detail-skeleton-copy">
            {[0, 1, 2, 3].map((item) => (
              <BlogSkeletonBlock
                key={`blog-skeleton-late-line-${item}`}
                className={item === 3 ? 'is-medium' : ''}
              />
            ))}
          </div>
        </section>

        <section className="blog-detail-author-strip blog-detail-skeleton-author-inline">
          <BlogSkeletonBlock className="blog-detail-skeleton-avatar is-large" />
          <span>
            <BlogSkeletonBlock />
            <BlogSkeletonBlock className="is-short" />
          </span>
          <BlogSkeletonBlock className="blog-detail-skeleton-follow" />
        </section>

        <section className="article-editorial-side-related article-author-related-section blog-detail-inline-author-related blog-detail-skeleton-author-related">
          <BlogSkeletonBlock className="blog-detail-skeleton-section-title" />
          <div className="article-author-content-grid">
            {[0, 1, 2, 3].map((item) => (
              <div className="article-related-card is-editorial blog-detail-skeleton-related-card" key={`blog-skeleton-author-card-${item}`}>
                <BlogSkeletonBlock className="article-related-media" />
                <span className="article-related-copy">
                  <BlogSkeletonBlock />
                  <BlogSkeletonBlock />
                  <BlogSkeletonBlock className="is-short" />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="blog-detail-comments-panel blog-detail-skeleton-comments">
          <div className="blog-detail-comments-header">
            <BlogSkeletonBlock className="blog-detail-skeleton-comments-title" />
            <BlogSkeletonBlock className="blog-detail-skeleton-sort" />
          </div>
          <div className="blog-detail-comment-form">
            <BlogSkeletonBlock className="blog-detail-skeleton-avatar" />
            <BlogSkeletonBlock className="blog-detail-skeleton-comment-input" />
          </div>
        </section>
      </article>
    </main>

    <aside className="blog-detail-side-panel blog-detail-skeleton-side" aria-hidden="true">
      <section className="blog-detail-side-card blog-detail-side-author">
        <BlogSkeletonBlock className="blog-detail-skeleton-section-title" />
        <div className="blog-detail-side-author-head">
          <BlogSkeletonBlock className="blog-detail-skeleton-avatar is-large" />
          <span>
            <BlogSkeletonBlock />
            <BlogSkeletonBlock className="is-short" />
          </span>
        </div>
        <BlogSkeletonBlock className="blog-detail-skeleton-stat-line" />
        <BlogSkeletonBlock className="blog-detail-skeleton-bio" />
        <BlogSkeletonBlock className="blog-detail-skeleton-bio is-medium" />
      </section>

      <section className="article-editorial-side-related article-author-related-section blog-detail-side-author-related blog-detail-skeleton-author-related">
        <BlogSkeletonBlock className="blog-detail-skeleton-section-title" />
        <div className="article-author-content-grid">
          {[0, 1, 2].map((item) => (
            <div className="article-related-card is-editorial blog-detail-skeleton-related-card" key={`blog-skeleton-side-card-${item}`}>
              <BlogSkeletonBlock className="article-related-media" />
              <span className="article-related-copy">
                <BlogSkeletonBlock />
                <BlogSkeletonBlock />
                <BlogSkeletonBlock className="is-short" />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="blog-detail-side-card">
        <BlogSkeletonBlock className="blog-detail-skeleton-section-title" />
        {[0, 1, 2].map((item) => (
          <BlogSkeletonBlock className="blog-detail-skeleton-side-row" key={`blog-skeleton-side-row-${item}`} />
        ))}
      </section>
    </aside>
  </div>
);

// User Profile Skeleton
export const UserProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="theme-panel rounded-3xl shadow-xl p-6 sm:p-8 border border-[var(--border-default)]">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
        <SkeletonBlock className="w-32 h-32 rounded-full" />
        <div className="flex-1 w-full">
          <SkeletonBlock className="h-8 w-56 mb-3" />
          <SkeletonBlock className="h-4 w-2/3 mb-2" />
          <SkeletonBlock className="h-4 w-1/2 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SkeletonBlock className="h-14 w-full rounded-lg" />
            <SkeletonBlock className="h-14 w-full rounded-lg" />
            <SkeletonBlock className="h-14 w-full rounded-lg" />
            <SkeletonBlock className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <SkeletonBlock className="h-4 w-32 mb-3" />
      <div className="grid grid-cols-12 gap-1">
        {[...Array(60)].map((_, i) => (
          <SkeletonBlock key={i} className="h-2.5 w-full rounded-sm" />
        ))}
      </div>
    </div>

    <div className="theme-modal-card rounded-2xl shadow-xl p-6 sm:p-8 border border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-6">
        <SkeletonBlock className="h-7 w-52" />
        <SkeletonBlock className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex items-end gap-3 h-48">
        <SkeletonBlock className="h-20 w-full rounded-t-lg" />
        <SkeletonBlock className="h-36 w-full rounded-t-lg" />
        <SkeletonBlock className="h-28 w-full rounded-t-lg" />
        <SkeletonBlock className="h-40 w-full rounded-t-lg" />
        <SkeletonBlock className="h-24 w-full rounded-t-lg" />
        <SkeletonBlock className="h-32 w-full rounded-t-lg" />
      </div>
    </div>

    <div className="theme-modal-card rounded-2xl shadow-xl p-6 sm:p-8 border border-[var(--border-default)]">
      <div className="flex items-center gap-4 mb-6">
        <SkeletonBlock className="h-8 w-28 rounded-md" />
        <SkeletonBlock className="h-8 w-24 rounded-md" />
        <SkeletonBlock className="h-8 w-20 rounded-md" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5 space-y-3">
            <SkeletonBlock className="h-6 w-4/5" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Table Row Skeleton (for admin)
export const TableRowSkeleton = () => (
  <tr>
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 bg-gray-200 rounded-full ${shimmer}`}></div>
        <div className={`h-4 bg-gray-200 rounded w-32 ${shimmer}`}></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className={`h-4 bg-gray-200 rounded w-40 ${shimmer}`}></div></td>
    <td className="px-6 py-4"><div className={`h-4 bg-gray-200 rounded w-12 ${shimmer}`}></div></td>
    <td className="px-6 py-4"><div className={`h-4 bg-gray-200 rounded w-20 ${shimmer}`}></div></td>
    <td className="px-6 py-4"><div className={`h-4 bg-gray-200 rounded w-24 ${shimmer}`}></div></td>
    <td className="px-6 py-4"><div className={`h-4 bg-gray-200 rounded w-16 ${shimmer}`}></div></td>
  </tr>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between">
      <div>
        <div className={`h-4 bg-gray-200 rounded w-24 mb-2 ${shimmer}`}></div>
        <div className={`h-8 bg-gray-200 rounded w-16 ${shimmer}`}></div>
      </div>
      <div className={`w-12 h-12 bg-gray-200 rounded-full ${shimmer}`}></div>
    </div>
  </div>
);

// Chat Skeleton
export const ChatSkeleton = () => (
  <div className="flex h-screen bg-[var(--background-primary)]">
    {/* Sidebar Skeleton */}
    <div className="w-80 bg-[var(--surface-card)] border-r border-[var(--border-default)] flex flex-col">
      <div className="p-4 border-b border-[var(--border-default)]">
        <SkeletonBlock className="h-6 w-32" />
      </div>
      <div className="p-3 border-b border-[var(--border-default)]">
        <SkeletonBlock className="h-10 rounded-md" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center p-3 border-b border-[var(--border-default)]">
            <SkeletonBlock className="w-12 h-12 rounded-full" />
            <div className="ml-3 flex-1">
              <SkeletonBlock className="h-4 w-32 mb-2" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Chat Area Skeleton */}
    <div className="flex-1 flex items-center justify-center bg-[var(--surface-card)]">
      <div className="text-center">
        <SkeletonBlock className="w-24 h-24 mx-auto mb-4 rounded-full" />
        <SkeletonBlock className="h-6 w-48 mx-auto mb-2" />
        <SkeletonBlock className="h-4 w-64 mx-auto" />
      </div>
    </div>
  </div>
);

export default {
  BlogCardSkeleton,
  HomePageSkeleton,
  BlogDetailSkeleton,
  UserProfileSkeleton,
  TableRowSkeleton,
  StatsCardSkeleton,
  ChatSkeleton
};
