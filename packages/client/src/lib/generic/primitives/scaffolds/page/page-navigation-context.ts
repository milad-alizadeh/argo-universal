import { createContext } from 'react';

// Previews have no page navigator of their own; the App enables stock headers by default.
export const PageNavigationEnabled = createContext(true);
