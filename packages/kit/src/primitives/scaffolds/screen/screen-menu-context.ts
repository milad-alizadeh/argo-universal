import { createContext, use } from 'react';

// What a narrow root's ☰ does and shows, as the App supplies it.
export interface ScreenMenu {
  onOpen: () => void;
  // A dot while something outside the page needs attention, such as a Session.
  badge: boolean;
}

// Kit-only, as `onBack`. The App's provider marks a narrow root, so a deep-linked page still draws Back.
export const ScreenMenuContext = createContext<ScreenMenu | null>(null);

export function useScreenMenu(): ScreenMenu | null {
  return use(ScreenMenuContext);
}
