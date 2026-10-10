import type * as React from 'react';
import {
  type ComponentType,
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';

interface ScreenHeaderSearch {
  placeholder: string;
  onChangeText: (text: string) => void;
}

// One line: a leading item, the title, and one or two trailing items.
export interface ScreenHeaderProps {
  title: string;
  left?: ReactNode;
  // Each a separate item, so iOS 26 gives each its own glass bubble.
  right?: readonly ReactElement[];
  search?: ScreenHeaderSearch;
}

const ScreenHeaderContext =
  createContext<ComponentType<ScreenHeaderProps> | null>(null);

export interface ScreenHeaderProviderProps {
  header: ComponentType<ScreenHeaderProps>;
  children: ReactNode;
}

// The app supplies the native stack's header, so this package stays free of the router.
export function ScreenHeaderProvider({
  header,
  children,
}: ScreenHeaderProviderProps): React.JSX.Element {
  return (
    <ScreenHeaderContext.Provider value={header}>
      {children}
    </ScreenHeaderContext.Provider>
  );
}

// Sets the header of the phone stack screen it renders in; outside a phone stack it draws nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  const Header = useContext(ScreenHeaderContext);
  return Header ? createElement(Header, props) : null;
}
