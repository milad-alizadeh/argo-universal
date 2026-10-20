import { createContext } from 'react';

// True where a List's sections end their container, as the sidebar's pinned section does, so none draws space after itself.
export const SectionEndContext = createContext(false);
