// Loading placeholders shaped like the content that is coming (instead of
// spinners). Soft pulse, disabled for people who prefer reduced motion.
import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`rounded-xl bg-[#E7EAF0] motion-safe:animate-pulse ${className}`}
  />
);

/** A white card with a title line and `lines` text lines. */
export const SkeletonCard: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div
    className={`p-5 sm:p-6 rounded-[24px] bg-white border border-[#ECEFF4] space-y-3 ${className}`}
  >
    <Skeleton className="h-5 w-1/3" />
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

/** Rows of « image + two lines » (orders, products, notifications…). */
export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3" role="status" aria-label="Chargement">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="p-4 rounded-[20px] bg-white border border-[#ECEFF4] flex items-center gap-4"
      >
        <Skeleton className="w-14 h-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
        <Skeleton className="hidden sm:block h-9 w-24" />
      </div>
    ))}
  </div>
);

/** Stat tiles + two panels (analytics-like pages). */
export const SkeletonStats: React.FC = () => (
  <div className="space-y-4" role="status" aria-label="Chargement">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-[#ECEFF4] space-y-3">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-7 w-1/2" />
        </div>
      ))}
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <SkeletonCard lines={5} />
      <SkeletonCard lines={5} />
    </div>
  </div>
);

/** Whole dashboard shell while the store loads. */
export const DashboardSkeleton: React.FC = () => (
  <div
    className="flex min-h-screen lg:p-3 lg:gap-3"
    role="status"
    aria-label="Chargement de votre boutique"
  >
    <div className="hidden lg:flex w-[272px] shrink-0 flex-col gap-3 p-5 rounded-[32px] bg-white border border-[#ECEFF4]">
      <Skeleton className="h-9 w-28 mb-4" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
    <div className="flex-1 min-w-0 space-y-4 p-4 lg:p-0">
      <div className="p-5 rounded-[22px] bg-white border border-[#ECEFF4] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-11 w-full max-w-md" />
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="lg:px-3">
        <SkeletonStats />
      </div>
    </div>
  </div>
);
