import { cloneElement, isValidElement, useMemo, type ReactNode } from 'react';
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
