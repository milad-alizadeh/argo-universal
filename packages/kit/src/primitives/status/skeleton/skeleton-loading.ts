import { createContext, use } from 'react';

/*
 * Whether a loading Skeleton holds this content. A Skeleton draws what its children draw, so content with no data
 * of its own yet asks this and stands in for itself: a List makes placeholder rows, a Text a line of its role's width.
 */
export const SkeletonLoadingContext = createContext(false);

export const useSkeletonLoading = (): boolean => use(SkeletonLoadingContext);
