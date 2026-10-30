import type { ComponentProps, ReactNode } from 'react';
import type { Pressable } from 'react-native';
import type { ContextMenuMeta } from '#primitives/actions/action';
import type { Tone } from '#primitives/content/text';
import type { KitProps } from '../../kit-props';

export type RowBadge = Exclude<
  NonNullable<KitProps<'ListItem'>['badge']>,
  number
>;

// Kit-only: native selection semantics, long press and test identity.
export type ListItemProps = KitProps<'ListItem'> & {
  // What the row's context menu shows around its `actions`: a title, a page previewed above it, a double-click.
  contextMenu?: ContextMenuMeta;
  // A control under the title, such as a Slider, spanning the row's content width.
  control?: ReactNode;
  // The title and subtitle wrap rather than truncate, for a row whose words are its content, such as a plan step.
  multiline?: boolean;
  onPointerDown?: ComponentProps<typeof Pressable>['onPointerDown'];
  onKeyDown?: ComponentProps<typeof Pressable>['onKeyDown'];
  // An option is a listbox's row, highlighted while focus stays in the field that owns it; `selected` is its highlight.
  role?: 'button' | 'link' | 'group' | 'option';
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
  // The row's element id, which a field's `aria-activedescendant` names.
  nativeID?: string;
  accessibilityRole?: 'button' | 'radio';
  onLongPress?: () => void;
  // A value that reads as content, such as a Server's details, in the title's colour rather than muted.
  valueTone?: 'neutral';
  // Draws the disclosure chevron of a row that pushes a page, outside a choosing section.
  disclosure?: boolean;
  testID?: string;
  /*
   * A desktop sidebar row (Paper "SessionsList"): 10 by 12 inside, 10 between lanes, a 16 leading slot and a medium
   * title. It ends its title line with the trailing item and insets the progress bar under the content; in a compact
   * List it is one 36-tall line.
   */
  sidebar?: boolean;
  // A sidebar row that holds news for its reader, such as an unread Session: its title is semibold.
  emphasized?: boolean;
  // The subtitle's colour; muted unless the row says otherwise.
  subtitleTone?: Tone;
  // A subtitle that wraps onto a second line rather than truncating, such as a Mode's description.
  subtitleLines?: 2;
  /*
   * Items with presses of their own, such as a Plugin's links: after the meta line's items, or after the trailing
   * items. They sit beside the row's press rather than inside it, so pressing one never presses the row and a screen
   * reader reaches each after the row. A part among them that should press the row instead is a `ListItemInert`.
   */
  metaAccessories?: ReactNode;
  trailingAccessories?: ReactNode;
  // A glyph leading the subtitle in its tone, such as the Plugin that wrote a Session row's Activity line.
  subtitleIcon?: KitProps<'Icon'>['name'];
  // De-emphasized secondary text on a completed row.
  subtitleDimmed?: boolean;
  // A role avatar occupies its own 36px lane instead of the icon lane.
  leadingSize?: 'avatar';
  /*
   * A choice that has been made but has not taken effect yet: the row's mark is a spinner until it has. The
   * list stays as it is, so the wait happens where the reader is looking rather than on the page they go to.
   */
  pending?: boolean;
};
