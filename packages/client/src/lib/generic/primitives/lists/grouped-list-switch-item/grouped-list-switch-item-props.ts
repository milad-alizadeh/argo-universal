import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';

// A row that is one on/off setting: its label names the switch.
export interface GroupedListSwitchItemProps extends Pick<
  GroupedListItemProps,
  'label' | 'icon' | 'disabled' | 'size'
> {
  value: boolean;
  onValueChange: (value: boolean) => void;
}
