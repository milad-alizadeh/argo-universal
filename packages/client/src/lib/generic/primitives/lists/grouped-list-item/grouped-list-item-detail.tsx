import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useOverlayList } from '#primitives/fields/field-layout';

interface DetailLayout {
  row: string;
  title: string;
  detail?: string;
}

// Paper's popover Effort row keeps the overlay's 8 lane: the title line, then its control 12 below.
const detailLayouts: Record<'overlay' | 'list', DetailLayout> = {
  overlay: { row: 'flex-1 gap-3', title: 'flex-row items-center' },
  list: {
    row: 'flex-1',
    title: 'min-h-13 wide:min-h-11 flex-row items-center px-4 py-3',
    detail: 'px-4 pb-3',
  },
};

// A row with a control below its title, such as an effort slider.
export function GroupedListItemDetail(props: {
  detail: ReactElement;
  children: ReactNode;
}): ReactElement {
  const layout = detailLayouts[useOverlayList() ? 'overlay' : 'list'];

  return (
    <View className={layout.row}>
      <View className={layout.title}>{props.children}</View>
      <View className={layout.detail}>{props.detail}</View>
    </View>
  );
}
