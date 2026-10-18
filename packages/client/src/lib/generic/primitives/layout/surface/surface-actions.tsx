import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ActionList,
  type ActionListProps,
} from '#primitives/actions/action-list';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';

export function withSurfaceActions(
  actions: ReactNode,
  trigger: ReactElement<ContextMenuTriggerProps>,
): ReactElement {
  const lists = actionLists(actions);
  const first = lists[0];

  if (!first) return trigger;

  const context: ActionListProps = {
    variant: 'context',
    trigger,
    plugin: lists.some((list) => list.props.plugin),
  };

  return cloneElement(first, context, lists.map(declarations));
}

function actionLists(content: ReactNode): ReactElement<ActionListProps>[] {
  return Children.toArray(content).flatMap(actionList);
}

function actionList(child: ReactNode): ReactElement<ActionListProps>[] {
  if (!isValidElement<ActionListProps>(child)) return [];

  return nestedLists(child);
}

function nestedLists(
  child: ReactElement<ActionListProps>,
): ReactElement<ActionListProps>[] {
  if (child.type === Fragment)
    return actionLists(child.props.children).map((list) =>
      cloneElement(list, { key: `${child.key}/${list.key}` }),
    );

  return child.type === ActionList ? [child] : [];
}

function declarations(list: ReactElement<ActionListProps>): ReactElement {
  return <Fragment key={list.key}>{list.props.children}</Fragment>;
}
