import type { ComponentProps } from 'react';
import type { Pressable } from 'react-native';
import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: native selection semantics, long press and test identity.
export type ListItemProps = KitProps<'ListItem'> & {
  onPointerDown?: ComponentProps<typeof Pressable>['onPointerDown'];
  onKeyDown?: React.KeyboardEventHandler;
  role?: 'button' | 'link' | 'group';
  onHoverIn?: ComponentProps<typeof Pressable>['onHoverIn'];
  onHoverOut?: ComponentProps<typeof Pressable>['onHoverOut'];
  // Muted: a placeholder line, such as an empty section's, with no surface of its own.
  tone?: 'accent' | 'danger' | 'muted';
  href?: string;
  ref?: ComponentProps<typeof Pressable>['ref'];
  'aria-haspopup'?: 'dialog' | 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  id?: string;
  accessibilityRole?: 'button' | 'radio';
  onLongPress?: () => void;
  testID?: string;
  // A placeholder while the list loads: bars where the leading icon, title, subtitle and meta will be, each as wide as its placeholder text.
  isLoading?: boolean;
};
