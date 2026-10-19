import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageDrawerHeader } from './page-drawer-header';
import { PageHeaderItems, pageTitleOptions } from './page-header-items';
import { usePageHeaderHost } from './page-navigation-context';
import type { PageProps } from './page-props';

export function PageNavigation(props: PageProps): ReactNode {
  const host = usePageHeaderHost();

  if (host === 'none') return null;

  if (host === 'drawer') return <PageDrawerHeader {...props} />;

  return <StackHeader {...props} />;
}

function StackHeader(props: PageProps): ReactElement {
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
