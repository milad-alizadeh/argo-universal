import type { SkeletonProps } from './skeleton-props';

export const loadingSkeleton = {
  loading: true,
  animation: 'pulse',
} satisfies Omit<SkeletonProps, 'children'>;

export const stillSkeleton = {
  loading: true,
  animation: 'none',
} satisfies Omit<SkeletonProps, 'children'>;

export const loadedSkeleton = {
  loading: false,
} satisfies Omit<SkeletonProps, 'children'>;
