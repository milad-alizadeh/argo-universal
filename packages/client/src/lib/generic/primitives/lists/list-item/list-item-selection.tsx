import { useContext, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
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

  return selectionMode ? choiceMark(props, selectionMode) : null;
}

function choiceMark(
  props: ListItemProps,
  mode: ListSelection['selectionMode'],
): ReactNode {
  if (mode === 'multiple' && Platform.OS === 'android')
    return (
      <CheckboxIndicator value={!!props.selected} disabled={props.disabled} />
    );

  return <ChoiceMark {...props} />;
}

// Paper Combobox 9BM-0: a menu row in a choice list keeps a leading slot for its check, so labels align.
export function ChoiceSlot(props: ListItemProps): ReactNode {
  const { selectionMode } = useContext(ListContext);

  if (!selectionMode) return null;

  return (
    <View className="h-5 w-4 shrink-0 items-center justify-center">
      <ChoiceMark {...props} />
    </View>
  );
}
