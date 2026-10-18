import { Children, isValidElement, type ReactNode } from 'react';
import {
  ActionList,
  type ActionListProps,
} from '#primitives/actions/action-list';
import {
  actionGroups,
  orderedGroups,
  type DeclaredAction,
} from '#primitives/actions/action-list';

export function pageActions(node: ReactNode): DeclaredAction[] {
  return Children.toArray(node).flatMap(declaredActions);
}

function declaredActions(node: ReactNode): DeclaredAction[] {
  if (!isValidElement<ActionListProps>(node)) return [];

  if (node.type === ActionList)
    return orderedGroups(actionGroups(node.props.children)).flatMap(
      (group) => group.actions,
    );

  return pageActions(node.props.children);
}

export function headerActions(
  actions: DeclaredAction[],
  slots: number,
): HeaderActions {
  const safe = actions.filter((action) => action.tone !== 'danger');
  const count = directCount(actions.length, safe.length, slots);
  const direct = safe.slice(0, count);

  return {
    direct,
    overflow: actions.filter((action) => !direct.includes(action)),
  };
}

interface HeaderActions {
  direct: DeclaredAction[];
  overflow: DeclaredAction[];
}

function directCount(total: number, safe: number, slots: number): number {
  if (total <= slots && safe === total) return slots;

  return Math.max(0, slots - 1);
}
