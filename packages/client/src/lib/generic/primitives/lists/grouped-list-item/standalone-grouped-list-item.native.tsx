import { RNHostView } from '@expo/ui';
import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Host } from '#primitives/native/host';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { GroupedListItem } from './grouped-list-item';

type Props = ComponentProps<typeof GroupedListItem>;

// Plugin parents are React Native layouts, whereas compact rows draw in SwiftUI or Compose.
export function StandaloneGroupedListItem(props: Props): ReactElement {
  if (useSizeClass() !== 'compact') return <GroupedListItem {...props} />;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <GroupedListItem {...props} detail={bridgedDetail(props.detail)} />
    </Host>
  );
}

function bridgedDetail(detail: Props['detail']): ReactElement | undefined {
  if (!detail) return undefined;

  return (
    <RNHostView matchContents>
      <View>{detail}</View>
    </RNHostView>
  );
}
