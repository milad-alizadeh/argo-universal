import type { ReactElement } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { ScreenHeadingBody } from './screen-heading-row';
import { useScreenNavigator } from './screen-navigation-context';
import type { ScreenHeaderInput } from './screen-props';

export function ScreenHeading(props: ScreenHeaderInput): ReactElement | null {
  const wide = useWide();
  const navigator = useScreenNavigator();

  if (!wide && navigator) return null;

  return <ScreenHeadingBody {...props} />;
}
