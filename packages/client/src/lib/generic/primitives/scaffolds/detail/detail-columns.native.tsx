import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { DetailColumnsProps } from './detail-props';

// Phones: one column, the content first, then its Metadata.
export function DetailColumns(props: DetailColumnsProps): ReactElement {
  return (
    <View className="gap-6">
      {props.children}
      {props.metadata}
    </View>
  );
}
