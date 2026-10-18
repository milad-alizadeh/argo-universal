import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: native selection semantics, long press and test identity.
export type ListItemProps = KitProps<'ListItem'> & {
  id?: string;
  accessibilityRole?: 'button' | 'radio';
  onLongPress?: () => void;
  testID?: string;
};
