import { createContext, useContext } from 'react';

export const InListItem = createContext(false);

export const useInListItem = (): boolean => useContext(InListItem);
