import type * as React from 'react';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { useWide } from '../../../lib/generic/use-wide/use-wide';

// A phone's native header names the page; a wide window draws the title in the page itself.
export function PhoneTitle({
  title,
}: {
  title: string;
}): React.JSX.Element | null {
  if (useWide()) return null;
  return <ScreenHeader title={title} />;
}
