import type { ReactElement } from 'react';
import { View } from 'react-native';
import { PageColumn } from './page-column';
import { HeadingRow } from './page-heading-row';
import type { PageProps } from './page-props';

export function PageHeadingBody(props: PageProps): ReactElement {
  return (
    <View className="py-6">
      <PageColumn>
        <HeadingRow {...props} />
      </PageColumn>
    </View>
  );
}
