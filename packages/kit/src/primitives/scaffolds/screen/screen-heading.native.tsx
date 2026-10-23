import type { ReactElement } from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { ScreenHeadingBody } from './screen-heading-row';
import type { ScreenHeaderInput } from './screen-props';

export function ScreenHeading(props: ScreenHeaderInput): ReactElement | null {
  return useWide() ? <ScreenHeadingBody {...props} /> : null;
}
