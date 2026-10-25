import { Skeleton as SkeletonRoot } from './skeleton';
import { SkeletonIgnore } from './skeleton-ignore';

export const Skeleton = Object.assign(SkeletonRoot, {
  Ignore: SkeletonIgnore,
});

export type { SkeletonIgnoreProps, SkeletonProps } from './skeleton-props';
