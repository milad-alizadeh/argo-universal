import type { ReactElement } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageHeadingBody } from './page-heading-row';
import { usePageNavigator } from './page-navigation-context';
import type { PageHeaderInput } from './page-props';

export function PageHeading(props: PageHeaderInput): ReactElement | null {
  const wide = useWide();
  const navigator = usePageNavigator();

  if (!wide && navigator) return null;

  return <PageHeadingBody {...props} />;
}
