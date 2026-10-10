import type * as React from 'react';
import { type ComponentType, type ReactNode, useState } from 'react';
import {
  type Navigate,
  type NavigationDestination,
  NavigationProvider,
} from '../lib/product/navigation/context';
import { ScreenHeaderProvider } from '../lib/product/navigation/screen-header';
import { ScreenHeaderMock } from '../mocks/screen-header-mock';
import type { Fixtures } from '../mocks/trpc-mock-link';

export interface NavigationRecorder {
  readonly destinations: readonly NavigationDestination[];
  // The destinations that replaced the current page.
  readonly replacements: readonly NavigationDestination[];
  navigate: Navigate;
  reset(): void;
}

export function createNavigationRecorder(): NavigationRecorder {
  const destinations: NavigationDestination[] = [];
  const replacements: NavigationDestination[] = [];
  return {
    destinations,
    replacements,
    navigate: (destination, options) => {
      destinations.push(destination);
      if (options?.replace) replacements.push(destination);
    },
    reset: () => {
      destinations.length = 0;
      replacements.length = 0;
    },
  };
}

interface StoryContext {
  id: string;
  parameters: {
    navigation?: NavigationRecorder;
    screenPreview?: boolean;
    trpc?: Fixtures;
  };
}

export function withNavigationMocks(
  Story: ComponentType,
  context: StoryContext,
): React.JSX.Element {
  if (
    !context.parameters.navigation &&
    !context.parameters.screenPreview &&
    !context.parameters.trpc
  )
    return <Story />;
  return (
    <NavigationMocks key={context.id} recorder={context.parameters.navigation}>
      <Story />
    </NavigationMocks>
  );
}

function NavigationMocks({
  recorder,
  children,
}: {
  recorder?: NavigationRecorder;
  children: ReactNode;
}): React.JSX.Element {
  const [navigation] = useState(() => recorder ?? createNavigationRecorder());
  return (
    <NavigationProvider navigate={navigation.navigate}>
      <ScreenHeaderProvider header={ScreenHeaderMock}>
        {children}
      </ScreenHeaderProvider>
    </NavigationProvider>
  );
}
