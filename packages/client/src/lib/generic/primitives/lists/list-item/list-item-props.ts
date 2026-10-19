import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: native selection semantics, long press and test identity.
export type ListItemProps = KitProps<'ListItem'> & {
  // An iOS read-only detail field lets a long trailing value share the row.
  labelPlacement?: 'beside';
  // A control under the title, such as a Slider, spanning the row's content width.
  control?: ReactNode;
  onPointerDown?: ComponentProps<typeof Pressable>['onPointerDown'];
  onKeyDown?: React.KeyboardEventHandler;
  role?: 'button' | 'link' | 'group';
  onHoverIn?: ComponentProps<typeof Pressable>['onHoverIn'];
  onHoverOut?: ComponentProps<typeof Pressable>['onHoverOut'];
  tone?: 'accent' | 'danger';
  href?: string;
  ref?: ComponentProps<typeof Pressable>['ref'];
  'aria-haspopup'?: 'dialog' | 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  id?: string;
  accessibilityRole?: 'button' | 'radio';
  onLongPress?: () => void;
  testID?: string;
};
