import type { ReactElement } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageHeadingBody } from './page-heading-row';
import type { PageProps } from './page-props';

export function PageHeading(props: PageProps): ReactElement | null {
  return useWide() ? <PageHeadingBody {...props} /> : null;
}
