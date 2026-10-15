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

export interface ScreenHeaderProviderProps {
  header: ComponentType<ScreenHeaderProps>;
  children: ReactNode;
}

// The app supplies the web stack's header here; Storybook supplies a mock, so a story renders a page's header without a navigator.
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

// Sets the header of the narrow web stack page it renders in; without a provider it draws nothing.
export function ScreenHeader(
  props: ScreenHeaderProps,
): React.JSX.Element | null {
  const Header = useContext(ScreenHeaderContext);

  return Header ? createElement(Header, props) : null;
}
