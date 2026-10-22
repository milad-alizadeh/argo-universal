import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { VirtualListItemProps } from './virtual-list-item-props';

type VirtualListItemFixture = Omit<VirtualListItemProps, 'onPress'>;

const leading = <Icon size="sm" name="agent" />;

export const firstInSectionVirtualListItem = {
  title: 'Item one',
  leading,
  trailing: <Text role="row-detail">3/8</Text>,
  position: 'first',
} satisfies VirtualListItemFixture;

export const middleOfSectionVirtualListItem = {
  title: 'Item two',
  leading,
  trailing: <Text role="row-detail">12m</Text>,
  position: 'middle',
} satisfies VirtualListItemFixture;

export const lastInSectionVirtualListItem = {
  title: 'Item three',
  leading,
  trailing: <Text role="row-detail">1h</Text>,
  position: 'last',
} satisfies VirtualListItemFixture;

export const selectedRowVirtualListItem = {
  title: 'Item one',
  leading,
  trailing: <Text role="row-detail">3/8</Text>,
  position: 'first',
  selected: true,
} satisfies VirtualListItemFixture;

export const loneRowVirtualListItem = {
  title: 'Item four',
  leading,
  trailing: <Text role="row-detail">2h</Text>,
  position: 'only',
} satisfies VirtualListItemFixture;
