import type { DrawerItemProps } from './drawer-item-props';

type DrawerItemFixture = Omit<DrawerItemProps, 'onPress'>;

export const defaultDrawerItem = {
  label: 'Inbox',
  icon: 'sessions',
  selected: false,
} satisfies DrawerItemFixture;

export const selectedDrawerItem = {
  label: 'Inbox',
  icon: 'sessions',
  selected: true,
} satisfies DrawerItemFixture;

export const needsAttentionDrawerItem = {
  label: 'Inbox',
  icon: 'sessions',
  selected: false,
  badge: { count: 2, label: '2 items need attention' },
} satisfies DrawerItemFixture;

export const overNinetyNineDrawerItem = {
  label: 'Tasks',
  icon: 'issue',
  selected: false,
  badge: { count: 120, label: '120 open items' },
} satisfies DrawerItemFixture;
