import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { ScreenHeaderItems, screenTitleOptions } from './screen-header-items';
import { useScreenNavigator } from './screen-navigation-context';
import type { ScreenHeaderInput } from './screen-props';

export function ScreenNavigation(props: ScreenHeaderInput): ReactNode {
  if (!useScreenNavigator()) return null;

  return <StackHeader {...props} />;
}

function StackHeader(props: ScreenHeaderInput): ReactElement {
  const wide = useWide();

  return (
    <>
      <Stack.Screen options={titleOptions(props.title, wide)} />
      {wide ? null : <ScreenHeaderItems {...props} />}
    </>
  );
}

// A wide window draws the Screen's own heading, so the stack's header hides.
function titleOptions(
  title: string,
  wide: boolean,
): NativeStackNavigationOptions {
  return { ...screenTitleOptions, title, headerShown: !wide };
}
