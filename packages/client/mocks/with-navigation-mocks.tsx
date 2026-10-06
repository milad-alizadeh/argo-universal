import { type ComponentType, type ReactNode, useState } from 'react';
import {
  type Navigate,
  type NavigationDestination,
  NavigationProvider,
} from '../src/navigation/context';
import { ScreenHeaderProvider } from '../src/navigation/screen-header';
import { ScreenHeaderMock } from './screen-header-mock';

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
  parameters: { navigation?: NavigationRecorder };
}

export function withNavigationMocks(
  Story: ComponentType,
  context: StoryContext,
) {
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
}) {
  const [navigation] = useState(() => recorder ?? createNavigationRecorder());
  return (
    <NavigationProvider navigate={navigation.navigate}>
      <ScreenHeaderProvider header={ScreenHeaderMock}>
        {children}
      </ScreenHeaderProvider>
    </NavigationProvider>
  );
}
