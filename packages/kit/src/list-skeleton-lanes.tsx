import {
  type LoadingLanes,
  SkeletonContent,
  SkeletonMark,
  type SkeletonRow,
} from './list-skeleton';

// The icon's mark in the leading lane, the bars in the content's.
export function loadingLanes(row: SkeletonRow): LoadingLanes {
  return {
    leading: row.leading === undefined ? undefined : <SkeletonMark />,
    content: <SkeletonContent {...row} />,
  };
}
