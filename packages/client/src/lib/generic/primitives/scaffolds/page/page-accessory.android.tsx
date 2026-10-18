import type { ReactElement } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageFab } from './page-fab.android';
import type { PageProps } from './page-props';

export function PageAccessory(props: PageProps): ReactElement | null {
  if (useWide()) return null;

  return props.primaryAction ? <PageFab action={props.primaryAction} /> : null;
}
