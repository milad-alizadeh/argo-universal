import {
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ContextMenuProps } from '#primitives/overlays/menu';
import { flattenedChildren } from '../../../flattened-children';
import { ActionList } from './action-list';
import type { ActionListProps } from './action-list-props';

export interface ContextActionsProps {
  // A component's `actions` Slot: any number of ActionLists, offered as one context menu.
  actions?: ReactNode;
  // What the context menu opens on.
  children: ContextMenuProps['children'];
}

// Opens the actions on right-click and long press; with no ActionList, the trigger draws alone.
export function ContextActions(props: ContextActionsProps): ReactElement {
  const lists = flattenedChildren(props.actions).filter(isActionList);

  if (!lists.length) return props.children;

  return (
    <ActionList
      variant="context"
      trigger={props.children}
      plugin={lists.some((list) => list.props.plugin)}
    >
      {lists.map((list) => (
        <Fragment key={list.key}>{list.props.children}</Fragment>
      ))}
    </ActionList>
  );
}

function isActionList(
  child: ReactNode,
): child is ReactElement<ActionListProps> {
  return isValidElement(child) && child.type === ActionList;
}
