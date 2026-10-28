import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ActionButtons, actionGroups } from '#primitives/actions/action';
import type { ListSectionProps } from './list-props';
import type { HeaderProps } from './list-section-parts';

/*
 * The trailing nodes, then the declared Actions as small buttons, each glyph placed as in a 24 box 4 from the next.
 * Desktop and web show them on hover or keyboard focus, never after a click leaves focus behind; phones always show them.
 */
const actionsClassName =
  'h-6 shrink-0 flex-row items-center gap-3 px-1 wide-type:h-5 web:wide:opacity-0 web:wide:group-hover:opacity-100 web:wide:has-focus-visible:opacity-100';

// A sidebar's actions sit in their own 24 boxes, always shown.
const sidebarActionsClassName = 'h-6 shrink-0 flex-row items-center gap-1';

// Small buttons, each spoken with the section's title so every section's buttons keep their own names.
const actionButtons = (actions: ReactNode, title?: string): ReactNode =>
  hasActions(actions) ? (
    <ActionButtons actions={actions} look={{ size: 'sm', subject: title }} />
  ) : null;

const trailingClassName = (sidebar?: boolean): string =>
  sidebar ? sidebarActionsClassName : actionsClassName;

// Only a wide header draws its Actions as buttons; below it, a long press opens them.
export function HeaderActions({
  trailing,
  actions,
  sidebar,
  title,
}: Pick<HeaderProps, 'trailing' | 'actions' | 'sidebar' | 'title'>): ReactNode {
  const buttons = actionButtons(actions, title);

  if (!trailing && !buttons) return null;

  return (
    <View className={trailingClassName(sidebar)}>
      {trailing}
      {buttons}
    </View>
  );
}

export const hasActions = (actions: ReactNode): boolean =>
  actionGroups(actions).length > 0;

export function hasSectionHeader(props: ListSectionProps): boolean {
  return [
    props.title,
    props.leading,
    props.trailing,
    hasActions(props.actions),
    props.onExpandedChange,
    props.isLoading,
  ].some(Boolean);
}
