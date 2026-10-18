import { cn } from '../../../utils';
import type { ResolvedItemProps } from './grouped-list-item-props';

/*
 * A plain grouped row draws a stock iOS 26 Form row at every web width (owner, 2026-10-18): the
 * margin M is 16 on a phone and 20 from medium up, as on an iPad, the row is 54 tall, and only its
 * text steps down to the desktop type scale. Sidebar, card and popover rows keep their own sizes,
 * and a subtitled one of them is 50 tall on a wide window.
 */
const frames = {
  grouped: 'min-h-13.5 gap-4 px-4 py-3 wide:px-5',
  compact: 'min-h-13 gap-3 px-4 py-3 wide:min-h-11',
  compactSubtitled: 'wide:min-h-12.5 wide:py-1.5',
  detail: 'px-0 py-0 wide:px-0 wide:py-0',
} as const;

export function isGroupedRow(
  props: Pick<ResolvedItemProps, 'variant'>,
  sidebar: boolean,
  overlay: boolean | undefined,
): boolean {
  return !sidebar && !overlay && props.variant !== 'card';
}

// A row with a control below its title pads inside, around the title line and the control.
export function rowFrameClasses(
  props: Pick<ResolvedItemProps, 'subtitle' | 'detail'>,
  grouped: boolean,
): string {
  return cn(sizedFrame(props, grouped), props.detail && frames.detail);
}

function sizedFrame(
  props: Pick<ResolvedItemProps, 'subtitle'>,
  grouped: boolean,
): string {
  if (grouped) return frames.grouped;

  return cn(frames.compact, props.subtitle && frames.compactSubtitled);
}
