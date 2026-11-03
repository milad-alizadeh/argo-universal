import { createContext, useContext } from 'react';
import type { OpenState } from '#primitives/overlays/open-state';

export interface CollapsibleState extends OpenState {
  disabled: boolean;
  // Names the content's region, so the web's trigger can say which region it controls.
  contentId: string;
}

export const CollapsibleContext = createContext<CollapsibleState>({
  open: false,
  disabled: false,
  contentId: '',
  onOpenChange: () => {},
});

export const useCollapsibleOpen = (): boolean =>
  useContext(CollapsibleContext).open;

// A virtualized list that positions its rows itself hears each step of a row's height, so the rows below move in the same frame.
export interface CollapsibleLayoutSync {
  syncLayout: () => void;
  onMotionChange: (moving: boolean) => void;
  grow: (height: number) => void;
}

export const CollapsibleLayoutSyncContext =
  createContext<CollapsibleLayoutSync | null>(null);

export const duration = 200;

// Hides closed content from touches and assistive technology.
interface ContentAccessibility {
  pointerEvents: 'auto' | 'none';
  'aria-hidden': boolean;
  accessibilityElementsHidden: boolean;
  importantForAccessibility: 'auto' | 'no-hide-descendants';
}

export function contentAccessibility(open: boolean): ContentAccessibility {
  return {
    pointerEvents: open ? 'auto' : 'none',
    'aria-hidden': !open,
    accessibilityElementsHidden: !open,
    importantForAccessibility: open ? 'auto' : 'no-hide-descendants',
  };
}
