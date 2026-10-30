import { createContext, use } from 'react';

// The Frame's sidebar column already holds the side inset around its list.
export const SidebarGutterHeld = createContext(false);

export const useSidebarGutterHeld = (): boolean => use(SidebarGutterHeld);
