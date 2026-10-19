import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: native selection semantics, long press and test identity.
export type ListItemProps = KitProps<'ListItem'> & {
  // A control under the title, such as a Slider, spanning the row's content width.
  control?: ReactNode;
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
  // A value that reads as content, such as a Server's details, in the title's colour rather than muted.
  valueTone?: 'neutral';
  // Draws the disclosure chevron of a row that pushes a page, outside a choosing section.
  disclosure?: boolean;
  testID?: string;
  // A placeholder while the list loads: bars where the title, subtitle and meta will be, each as wide as its placeholder text; any `leading`, even null, becomes a round mark.
  isLoading?: boolean;
};
