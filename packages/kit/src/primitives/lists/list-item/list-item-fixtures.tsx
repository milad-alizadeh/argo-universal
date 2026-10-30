import { Pill } from '#primitives/status/pill';
import type { ListItemProps } from './list-item-props';

export const defaultListItem = { title: 'Item one' } satisfies ListItemProps;

export const selectedListItem = {
  title: 'Item two',
  subtitle: 'Subtitle',
  selected: true,
} satisfies ListItemProps;

export const progressListItem = {
  title: 'Item three',
  subtitle: 'Subtitle',
  meta: <Pill text="Meta" />,
  progress: { value: 0.4, tone: 'success', active: true },
} satisfies ListItemProps;

export const disabledListItem = {
  title: 'Disabled item',
  disabled: true,
  badge: 3,
} satisfies ListItemProps;

export const statusBadgeListItem = {
  title: 'Item four',
  subtitle: 'Subtitle',
  badge: { kind: 'status', tone: 'warning', label: 'Warning' },
} satisfies ListItemProps;

export const controlListItem = {
  title: 'Effort',
  value: 'High',
} satisfies ListItemProps;

export const mutedListItem = {
  title: 'No items',
  tone: 'muted',
} satisfies ListItemProps;
