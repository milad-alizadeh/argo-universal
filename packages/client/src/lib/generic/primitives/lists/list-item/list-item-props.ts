import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: long press and test identity; the frame owns its accessory lane.
export type ListItemProps = KitProps<'ListItem'> & {
  onLongPress?: () => void;
  testID?: string;
};
