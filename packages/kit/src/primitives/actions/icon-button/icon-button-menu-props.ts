import type { MenuEntry } from '#primitives/overlays/menu';
import type { IconButtonProps } from './icon-button';

// An icon button that opens a menu of actions: the button's look, and the rows the menu lists.
export type IconButtonMenuProps = Pick<
  IconButtonProps,
  'icon' | 'variant' | 'size' | 'control' | 'disabled' | 'accessibilityLabel'
> & {
  actions: readonly MenuEntry[];
};
