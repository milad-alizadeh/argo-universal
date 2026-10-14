import type * as React from 'react';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';

// Puts an open search in the place of the screen's app bar, or gives the app bar back with null.
export type ShowHeaderSearch = (bar: ReactElement | null) => void;

const HeaderSearchSlotContext = createContext<ShowHeaderSearch | null>(null);

export interface HeaderSearchSlotProviderProps {
  show: ShowHeaderSearch;
  children: ReactNode;
}

// The app supplies each phone screen's app bar, so this package stays free of the router.
export function HeaderSearchSlotProvider({
  show,
  children,
}: HeaderSearchSlotProviderProps): React.JSX.Element {
  return (
    <HeaderSearchSlotContext.Provider value={show}>
      {children}
    </HeaderSearchSlotContext.Provider>
  );
}

// Outside a phone screen, such as in Storybook, there is no app bar to swap.
export function useHeaderSearchSlot(): ShowHeaderSearch | null {
  return useContext(HeaderSearchSlotContext);
}
