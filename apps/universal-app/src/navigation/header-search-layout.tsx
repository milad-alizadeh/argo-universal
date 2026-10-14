import { HeaderSearchSlotProvider, type ShowHeaderSearch } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import { type ReactElement, type ReactNode, useCallback } from 'react';

interface ScreenNavigation {
  setOptions: (options: Partial<NativeStackNavigationOptions>) => void;
}

interface HeaderSearchLayoutProps {
  navigation: ScreenNavigation;
  children: ReactNode;
}

// Each phone screen lets its list's search take the app bar's place while it is open (Android's full-screen search).
export function headerSearchLayout(
  props: HeaderSearchLayoutProps,
): ReactElement {
  return <HeaderSearchScreen {...props} />;
}

function HeaderSearchScreen({
  navigation,
  children,
}: HeaderSearchLayoutProps): React.JSX.Element {
  const show = useCallback<ShowHeaderSearch>(
    (bar) =>
      navigation.setOptions({
        header: bar ? (): ReactElement => bar : undefined,
      }),
    [navigation],
  );

  return (
    <HeaderSearchSlotProvider show={show}>{children}</HeaderSearchSlotProvider>
  );
}
