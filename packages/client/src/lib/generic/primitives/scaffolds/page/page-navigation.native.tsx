import { NavigationContext } from 'expo-router/react-navigation';
import { use, type ReactNode } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageNavigationEnabled } from './page-navigation-context';
import { PagePhoneHeader } from './page-phone-header';
import type { PageProps } from './page-props';

export function PageNavigation(props: PageProps): ReactNode {
  const available = useNavigationAvailable();
  const wide = useWide();

  if (props.renderHeader) return props.renderHeader(props);

  if (!available) return null;

  return <PagePhoneHeader {...props} wide={wide} />;
}

function useNavigationAvailable(): boolean {
  const enabled = use(PageNavigationEnabled);
  const navigation = use(NavigationContext);

  return enabled && Boolean(navigation);
}
