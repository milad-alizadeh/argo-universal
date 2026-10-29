import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ActionButtons, actionGroups } from '#primitives/actions/action';
import { cn } from '../../../utils';
import type { ListSectionProps } from './list-props';
import type { HeaderProps } from './list-section-parts';

const actionsClassName =
  'h-6 shrink-0 flex-row items-center gap-3 px-1 wide-type:h-5';

// A sidebar's actions keep their 24px boxes while hidden, so the title never shifts.
const sidebarActionsClassName = 'h-6 shrink-0 flex-row items-center gap-1';

const controlsVisibility =
  'web:wide:hover-capable:opacity-0 web:wide:group-hover:opacity-100 web:wide:group-focus-within:opacity-100 web:wide:has-aria-expanded:opacity-100';

// Small buttons, each spoken with the section's title so every section's buttons keep their own names.
const actionButtons = (actions: ReactNode, title?: string): ReactNode =>
  hasActions(actions) ? (
    <ActionButtons actions={actions} look={{ size: 'sm', subject: title }} />
  ) : null;

const trailingClassName = (sidebar?: boolean): string =>
  cn(sidebar ? sidebarActionsClassName : actionsClassName, controlsVisibility);

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

const hasActions = (actions: ReactNode): boolean =>
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
