import type { HeaderItem } from './header-items';

type Placement = 'left' | 'right';

/*
 * The web has no stock bar button items: its JS header draws the items through `screenHeaderOptions`. Keeping the
 * Stack.Toolbar drawing in `header-toolbar.native.tsx` also keeps Android's Material images out of the web bundle.
 */
export function headerToolbar(
  _placement: Placement,
  _items: readonly HeaderItem[],
): null {
  return null;
}

export function toolbarItem(_item: HeaderItem, _separate: boolean): null {
  return null;
}
