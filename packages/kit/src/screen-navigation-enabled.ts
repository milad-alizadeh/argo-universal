import { createContext } from 'react';

/*
 * Previews have no page navigator of their own; the App enables stock headers by default. A sheet's pages turn it off,
 * so it lives apart from the Screen, which holds sheets of its own.
 */
export const ScreenNavigationEnabled = createContext(true);
