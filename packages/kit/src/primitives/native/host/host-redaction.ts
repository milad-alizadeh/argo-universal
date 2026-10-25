import { createContext } from 'react';

/*
 * True where a Skeleton is loading and an ignore view has not taken the subtree out of it. Expo UI content cannot
 * be seen from React Native, so a Host reads it and, on iOS, redacts itself.
 */
export const HostRedactionContext = createContext(false);
