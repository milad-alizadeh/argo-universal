import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { PageColumn } from './page-column';
import { HeadingRow } from './page-heading-row';
import type { PageProps } from './page-props';

export function PageHeading(props: PageProps): ReactElement | null {
  if (!useWide()) return null;

  return (
    <View className="py-6">
      <PageColumn>
        <HeadingRow {...props} />
      </PageColumn>
    </View>
  );
}
