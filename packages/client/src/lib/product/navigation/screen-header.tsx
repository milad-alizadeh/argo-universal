import type * as React from 'react';
import {
  type ComponentType,
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';
import type { IconName } from '#lib/generic/symbols/icon-names';

export interface ScreenHeaderSearch {
  placeholder: string;
  onChangeText: (text: string) => void;
  // A header item that goes with the search, such as New Session; iOS only, Android has its own button.
  action?: ScreenHeaderAction;
}

interface ScreenHeaderAction {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
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

const noCover = (): number => 0;
const HeaderCoverContext = createContext<() => number>(noCover);

export interface ScreenHeaderProviderProps {
  header: ComponentType<ScreenHeaderProps>;
  // How far down the screen a transparent header lies over the content; a solid header takes its own space.
  useHeaderCover?: () => number;
  children: ReactNode;
}

// The app supplies the native stack's header, so this package stays free of the router.
export function ScreenHeaderProvider({
  header,
  useHeaderCover: headerCover = noCover,
  children,
}: ScreenHeaderProviderProps): React.JSX.Element {
  return (
    <ScreenHeaderContext.Provider value={header}>
      <HeaderCoverContext.Provider value={headerCover}>
        {children}
      </HeaderCoverContext.Provider>
    </ScreenHeaderContext.Provider>
  );
}

// How far down the screen its header lies over the content, so something pinned to the top can sit below it.
export function useHeaderCover(): number {
  return useContext(HeaderCoverContext)();
}

// Sets the header of the phone stack screen it renders in; outside a phone stack it draws nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  const Header = useContext(ScreenHeaderContext);
  return Header ? createElement(Header, props) : null;
}
