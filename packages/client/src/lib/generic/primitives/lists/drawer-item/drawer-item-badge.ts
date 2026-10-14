import { badgeCountText } from '../../../badge-count';
import type { DrawerItemProps } from './drawer-item-props';

export interface DrawerBadge {
  // What the badge draws, such as "99+".
  text: string;
  // What a screen reader says for it.
  label: string;
}

// The row's badge, or none when there is nothing to count.
export function drawerBadge(
  props: Pick<DrawerItemProps, 'badge' | 'badgeLabel'>,
): DrawerBadge | undefined {
  const text = badgeCountText(props.badge);

  return text === undefined
    ? undefined
    : { text, label: props.badgeLabel ?? text };
}
