import React from 'react';

// Base shimmer animation
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

// Blog Card Skeleton
export const BlogCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
    <div className={`h-6 bg-gray-200 rounded w-3/4 mb-4 ${shimmer}`}></div>
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 bg-gray-200 rounded-full ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-24 ${shimmer}`}></div>
    </div>
    <div className={`h-4 bg-gray-200 rounded w-full mb-2 ${shimmer}`}></div>
    <div className={`h-4 bg-gray-200 rounded w-5/6 mb-2 ${shimmer}`}></div>
    <div className={`h-4 bg-gray-200 rounded w-4/6 mb-4 ${shimmer}`}></div>
    <div className="flex gap-4">
      <div className={`h-4 bg-gray-200 rounded w-16 ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-20 ${shimmer}`}></div>
    </div>
  </div>
);

// Blog Detail Skeleton
export const BlogDetailSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-xl p-8">
    <div className={`h-10 bg-gray-200 rounded w-3/4 mb-6 ${shimmer}`}></div>
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-12 h-12 bg-gray-200 rounded-full ${shimmer}`}></div>
      <div>
        <div className={`h-4 bg-gray-200 rounded w-32 mb-2 ${shimmer}`}></div>
        <div className={`h-3 bg-gray-200 rounded w-24 ${shimmer}`}></div>
      </div>
    </div>
    <div className="space-y-3 mb-6">
      <div className={`h-4 bg-gray-200 rounded w-full ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-full ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-5/6 ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-full ${shimmer}`}></div>
      <div className={`h-4 bg-gray-200 rounded w-4/6 ${shimmer}`}></div>
    </div>
  </div>
);

// User Profile Skeleton
export const UserProfileSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-xl p-8">
    <div className="flex items-center gap-6 mb-6">
      <div className={`w-32 h-32 bg-gray-200 rounded-full ${shimmer}`}></div>
      <div className="flex-1">
        <div className={`h-8 bg-gray-200 rounded w-48 mb-3 ${shimmer}`}></div>
        <div className={`h-4 bg-gray-200 rounded w-64 mb-4 ${shimmer}`}></div>
        <div className="flex gap-6">
          <div className={`h-6 bg-gray-200 rounded w-20 ${shimmer}`}></div>
          <div className={`h-6 bg-gray-200 rounded w-20 ${shimmer}`}></div>
          <div className={`h-6 bg-gray-200 rounded w-20 ${shimmer}`}></div>
        </div>
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
  <div className="flex h-screen bg-gray-50">
    {/* Sidebar Skeleton */}
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className={`h-6 bg-gray-200 rounded w-32 ${shimmer}`}></div>
      </div>
      <div className="p-3 border-b border-gray-200">
        <div className={`h-10 bg-gray-200 rounded-md ${shimmer}`}></div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center p-3 border-b border-gray-100">
            <div className={`w-12 h-12 bg-gray-200 rounded-full ${shimmer}`}></div>
            <div className="ml-3 flex-1">
              <div className={`h-4 bg-gray-200 rounded w-32 mb-2 ${shimmer}`}></div>
              <div className={`h-3 bg-gray-200 rounded w-48 ${shimmer}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Chat Area Skeleton */}
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className={`w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full ${shimmer}`}></div>
        <div className={`h-6 bg-gray-200 rounded w-48 mx-auto mb-2 ${shimmer}`}></div>
        <div className={`h-4 bg-gray-200 rounded w-64 mx-auto ${shimmer}`}></div>
      </div>
    </div>
  </div>
);

export default {
  BlogCardSkeleton,
  BlogDetailSkeleton,
  UserProfileSkeleton,
  TableRowSkeleton,
  StatsCardSkeleton,
  ChatSkeleton
};
