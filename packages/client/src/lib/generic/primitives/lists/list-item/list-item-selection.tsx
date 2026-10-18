import { useContext, type ReactNode } from 'react';
import { CheckboxIndicator } from '#primitives/inputs/checkbox';
import { ListContext, type ListSelection } from '../../../list-context';
import { ChoiceMark } from './list-item-choice-mark';
import type { ListItemProps } from './list-item-props';

function toggleSelection(id: string, current: readonly string[]): string[] {
  return current.includes(id)
    ? current.filter((key) => key !== id)
    : [...current, id];
}

function nextSelection(id: string, context: ListSelection): string[] {
  if (context.selectionMode === 'single') return [id];

  return toggleSelection(id, context.selection ?? []);
}

function select(id: string, context: ListSelection): void {
  context.onSelectionChange?.(nextSelection(id, context));
}

function controlledSelection(
  props: ListItemProps,
  id: string,
  context: ListSelection,
): ListItemProps {
  if (!context.onSelectionChange) return props;

  return {
    ...props,
    selected: (context.selection ?? []).includes(id),
    onPress: () => select(id, context),
  };
}

export function useItemSelection(props: ListItemProps): ListItemProps {
  const context = useContext(ListContext);

  return props.id === undefined
    ? props
    : controlledSelection(props, props.id, context);
}

export function ChoiceAccessory(props: ListItemProps): ReactNode {
  const { selectionMode } = useContext(ListContext);

  if (!selectionMode) return null;

  if (selectionMode === 'multiple')
    return (
      <CheckboxIndicator value={!!props.selected} disabled={props.disabled} />
    );

  return <ChoiceMark {...props} />;
}
