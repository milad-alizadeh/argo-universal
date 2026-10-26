import { cloneElement, isValidElement, useMemo, type ReactNode } from 'react';
import type { PressActionProps } from '#primitives/actions/action';
import { flattenedChildren } from '../../../flattened-children';
import type { ContentSelection } from './list-content-selection';

function disabledNode(node: ReactNode): ReactNode {
  if (!isValidElement<{ disabled?: boolean; children?: ReactNode }>(node))
    return node;

  return cloneElement(
    node,
    { disabled: true },
    disabledActions(node.props.children),
  );
}

function disabledActions(actions: ReactNode): ReactNode {
  return flattenedChildren(actions).map(disabledNode);
}

type Press = NonNullable<PressActionProps['onPress']>;

interface ActionNode {
  onPress?: PressActionProps['onPress'];
  children?: ReactNode;
}

// An Action's own `onPress` runs first, with what it was given, and its result is returned; then selection closes, as iOS Mail's does. A press that throws leaves the selection open.
function closingPress(press: Press, close: () => void): Press {
  return (...args) => {
    const result = press(...args);

    close();

    return result;
  };
}

function pressProps(onPress: Press | undefined, close: () => void): ActionNode {
  return onPress ? { onPress: closingPress(onPress, close) } : {};
}

function closingNode(node: ReactNode, close: () => void): ReactNode {
  if (!isValidElement<ActionNode>(node)) return node;
  const { onPress, children } = node.props;

  return cloneElement(
    node,
    pressProps(onPress, close),
    closingActions(children, close),
  );
}

// The selection Actions as the List draws them in a header, a toolbar, a row's menu and inline: each press closes selection once it has run.
export function closingActions(
  actions: ReactNode,
  close: () => void,
): ReactNode {
  if (actions === undefined || actions === null) return actions;

  return flattenedChildren(actions).map((node) => closingNode(node, close));
}

interface SelectionActions {
  active?: boolean;
  selected: number;
  actions?: ReactNode;
}

function selectionActions(input: SelectionActions): ReactNode {
  if (!input.active) return undefined;

  return input.selected > 0 ? input.actions : disabledActions(input.actions);
}

export function useSelectionActions(
  selection: ContentSelection | null,
): ReactNode {
  const { actions, active, selected } = selectionInput(selection);

  return useMemo(
    () => selectionActions({ actions, active, selected }),
    [actions, active, selected],
  );
}

function selectionInput(selection: ContentSelection | null): SelectionActions {
  if (!selection) return { active: false, selected: 0 };

  return {
    actions: selection.actions,
    active: selection.active,
    selected: selection.selected.length,
  };
}
