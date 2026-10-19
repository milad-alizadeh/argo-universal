import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageHeaderItems, pageTitleOptions } from './page-header-items';
import { usePageNavigator } from './page-navigation-context';
import type { PageHeaderInput } from './page-props';

export function PageNavigation(props: PageHeaderInput): ReactNode {
  const navigator = usePageNavigator();
  const wide = useWide();

  if (!navigator) return null;

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
