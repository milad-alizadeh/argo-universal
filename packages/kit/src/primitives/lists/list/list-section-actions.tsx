import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { HeaderProps } from './list-section-parts';

/*
 * Up to two IconButtons, each glyph placed as in a 24 box 4 from the next. Desktop and web show them on hover
 * or keyboard focus, never after a click leaves focus behind; phones always show them.
 */
const actionsClassName =
  'h-6 shrink-0 flex-row items-center gap-3 px-1 wide-type:h-5 web:wide:opacity-0 web:wide:group-hover:opacity-100 web:wide:has-focus-visible:opacity-100';

// A sidebar's actions sit in their own 24 boxes, always shown.
const sidebarActionsClassName = 'h-6 shrink-0 flex-row items-center gap-1';

export function HeaderActions({
  trailing,
  sidebar,
}: Pick<HeaderProps, 'trailing' | 'sidebar'>): ReactNode {
  if (!trailing) return null;

  if (sidebar)
    return <View className={sidebarActionsClassName}>{trailing}</View>;

  return <View className={actionsClassName}>{trailing}</View>;
}
