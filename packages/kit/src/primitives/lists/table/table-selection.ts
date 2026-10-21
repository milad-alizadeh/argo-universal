import type { TableProps } from './table-props';

type Selection = Pick<
  TableProps,
  'selectionMode' | 'selection' | 'onSelectionChange'
>;

export const isSelected = (props: Selection, id: string): boolean =>
  (props.selection ?? []).includes(id);

const toggled = (current: readonly string[], id: string): string[] =>
  current.includes(id) ? current.filter((key) => key !== id) : [...current, id];

function nextSelection(props: Selection, id: string): string[] {
  if (props.selectionMode === 'single') return [id];

  return toggled(props.selection ?? [], id);
}

// A choosing Table selects a row on press, as a choosing List does; otherwise the row runs its primary Action.
export function rowPress(
  props: Selection,
  row: { id: string; onPress?: () => void },
): (() => void) | undefined {
  const { selectionMode, onSelectionChange } = props;

  if (!selectionMode || !onSelectionChange) return row.onPress;

  return () => onSelectionChange(nextSelection(props, row.id));
}
