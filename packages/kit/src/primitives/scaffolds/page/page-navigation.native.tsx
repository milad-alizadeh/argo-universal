import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { PageHeaderItems, pageTitleOptions } from './page-header-items';
import { usePageNavigator } from './page-navigation-context';
import type { PageHeaderInput } from './page-props';

export function PageNavigation(props: PageHeaderInput): ReactNode {
  if (!usePageNavigator()) return null;

  return <StackHeader {...props} />;
}

function StackHeader(props: PageHeaderInput): ReactElement {
  const wide = useWide();

  return (
    <>
      <Stack.Screen options={titleOptions(props.title, wide)} />
      {wide ? null : <PageHeaderItems {...props} />}
    </>
  );
}

// A wide window draws the Page's own heading, so the stack's header hides.
function titleOptions(
  title: string,
  wide: boolean,
): NativeStackNavigationOptions {
  return { ...pageTitleOptions, title, headerShown: !wide };
}
