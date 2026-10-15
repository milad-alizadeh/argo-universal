import type * as React from 'react';
import { useWide } from '../../generic/use-wide/use-wide';
import { ScreenHeader } from './screen-header';

// A phone's native header names the page; a wide window draws the title in the page itself.
export function PhoneTitle({
  title,
}: {
  title: string;
}): React.JSX.Element | null {
  if (useWide()) return null;

  return <ScreenHeader title={title} />;
}
