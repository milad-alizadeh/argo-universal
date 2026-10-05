import { type ComponentType, type ReactNode, useState } from 'react';
import {
  type Navigate,
  type NavigationDestination,
  NavigationProvider,
} from '../src/navigation/context';

export interface NavigationRecorder {
  readonly destinations: readonly NavigationDestination[];
  navigate: Navigate;
  reset(): void;
}

export function createNavigationRecorder(): NavigationRecorder {
  const destinations: NavigationDestination[] = [];
  return {
    destinations,
    navigate: (destination) => destinations.push(destination),
    reset: () => {
      destinations.length = 0;
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
      {children}
    </NavigationProvider>
  );
}
