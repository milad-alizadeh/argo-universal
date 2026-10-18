import { NavigationContext } from 'expo-router/react-navigation';
import { use, type ReactElement } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageHeadingBody } from './page-heading-body';
import type { PageProps } from './page-props';

export function PageHeading(props: PageProps): ReactElement | null {
  const wide = useWide();
  const externalHeader = useExternalHeader(props);

  if (!wide && externalHeader) return null;

  return <PageHeadingBody {...props} />;
}

function useExternalHeader(props: PageProps): boolean {
  const navigation = use(NavigationContext);

  return Boolean(props.renderHeader || navigation);
}
