import type { ReactElement } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageHeadingBody } from './page-heading-row';
import type { PageHeaderInput } from './page-props';

export function PageHeading(props: PageHeaderInput): ReactElement | null {
  return useWide() ? <PageHeadingBody {...props} /> : null;
}
