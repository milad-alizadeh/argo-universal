import { NavigationContext } from 'expo-router/react-navigation';
import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageColumn } from './page-column';
import { HeadingRow } from './page-heading-row';
import type { PageProps } from './page-props';

export function PageHeading(props: PageProps): ReactElement | null {
  const wide = useWide();
  const externalHeader = useExternalHeader(props);

  if (!wide && externalHeader) return null;

  return (
    <View className="py-6">
      <PageColumn>
        <HeadingRow {...props} />
      </PageColumn>
    </View>
  );
}

function useExternalHeader(props: PageProps): boolean {
  const navigation = use(NavigationContext);

  return Boolean(props.renderHeader || navigation);
}
