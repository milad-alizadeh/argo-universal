import type { KitProps } from '../../kit-props';

/*
 * Kit-only: legacy native grouping, sizing and layout lifecycle.
 * Plugin GroupedList uses List; this internal native bridge accepts fixed children.
 */
export type GroupedListProps = Pick<KitProps<'GroupedList'>, 'children'> & {
  variant?: 'grouped' | 'sidebar';
  // A content-sized overlay uses compact groups rather than a full screen's scrolling column.
  fit?: boolean;
  gap?: 'sm';
  // The height of the sections, so a native sheet can fit them; only Android reports it.
  onContentHeightChange?: (height: number) => void;
};
