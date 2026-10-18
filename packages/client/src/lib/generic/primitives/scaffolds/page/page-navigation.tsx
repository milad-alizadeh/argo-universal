import { Stack } from 'expo-router';
import { NavigationContext } from 'expo-router/react-navigation';
import { use, type ReactNode } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { HeadingRow } from './page-heading-row';
import type { PageProps } from './page-props';

export function PageNavigation(props: PageProps): ReactNode {
  const navigation = use(NavigationContext);
  const wide = useWide();

  if (props.renderHeader) return props.renderHeader(props);

  if (!navigation) return null;

  const options = {
    title: props.title,
    headerShown: !wide,
    headerTitle: (): React.ReactElement => <HeadingRow {...props} />,
    headerTitleContainerStyle: { flexGrow: 1, flexShrink: 1 },
    headerRightContainerStyle: { flexGrow: 0 },
  };

  return <Stack.Screen options={options} />;
}
