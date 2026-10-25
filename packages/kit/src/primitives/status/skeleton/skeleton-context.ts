import { createContext, useContext } from 'react';

/*
 * True where a Skeleton is loading and an ignore view has not taken the subtree out of it. The kit Host reads it:
 * Expo UI content cannot be seen from React Native, so a Host inside a loading Skeleton redacts itself.
 */
export const SkeletonRedactedContext = createContext(false);

export const useSkeletonRedacted = (): boolean =>
  useContext(SkeletonRedactedContext);
