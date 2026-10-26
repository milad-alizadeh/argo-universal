import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { ListProps } from './list-props';
import { selectionIds } from './list-row-identity';
import {
  SelectionRange,
  selectRow,
  type SelectionInput,
  type RowPress,
} from './list-selection-model';

export interface ContentSelection {
  selected: readonly string[];
  active: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  change: (ids: readonly string[]) => void;
  press: (press: RowPress) => void;
  longPress: (id: string) => void;
  all: () => void;
  allSelected: boolean;
  coversSeparator: (id: string) => boolean;
  actions?: ReactNode;
}

interface EditMode {
  editing: boolean;
  setEditing: (editing: boolean) => void;
}

interface ContentRowSelection {
  selection: ContentSelection | null;
  id: string | undefined;
}

export const ContentSelectionContext = createContext<ContentSelection | null>(
  null,
);

export const ContentRowId = createContext<string | undefined>(undefined);

function selectionControls(
  input: SelectionInput,
  range: SelectionRange,
  edit: EditMode,
): Pick<ContentSelection, 'press' | 'longPress' | 'all' | 'coversSeparator'> {
  return {
    press: (press) => selectRow(input, range, press),
    longPress: (id) => beginSelection(input, edit, id),
    all: () => input.change(input.ids),
    coversSeparator: (id) => selectedNeighbours(input, id),
  };
}

function selectedNeighbours(input: SelectionInput, id: string): boolean {
  const next = input.ids[input.ids.indexOf(id) + 1];

  return (
    next !== undefined &&
    input.selected.includes(id) &&
    input.selected.includes(next)
  );
}

function contentSelection<Item>(
  props: ListProps<Item>,
  range: SelectionRange,
  edit: EditMode,
): ContentSelection | null {
  if (!props.selection) return null;
  const { selected, onChange } = props.selection;

  const input: SelectionInput = {
    ids: selectionIds(props),
    selected,
    change: (ids) => onChange?.(ids),
  };

  return makeSelection(input, { range, edit, actions: props.actions });
}

export function useContentSelection<Item>(
  props: ListProps<Item>,
): ContentSelection | null {
  const [editing, setEditing] = useState(false);
  const [range] = useState(() => new SelectionRange());

  return useMemo(
    () => contentSelection(props, range, { editing, setEditing }),
    [props, range, editing],
  );
}

export function useContentRowSelection(id?: string): ContentRowSelection {
  const selection = useContext(ContentSelectionContext);
  const rowId = useContext(ContentRowId);

  return { selection, id: id ?? rowId };
}

interface SelectionSetup {
  range: SelectionRange;
  edit: EditMode;
  actions?: ReactNode;
}

function makeSelection(
  input: SelectionInput,
  setup: SelectionSetup,
): ContentSelection {
  return {
    ...setup.edit,
    selected: input.selected,
    allSelected: selectedAll(input),
    change: input.change,
    active: Platform.OS === 'web' || setup.edit.editing,
    actions: setup.actions,
    ...selectionControls(input, setup.range, setup.edit),
  };
}

function beginSelection(
  input: SelectionInput,
  edit: EditMode,
  id: string,
): void {
  edit.setEditing(true);
  input.change([...new Set([...input.selected, id])]);
}

function selectedAll(input: SelectionInput): boolean {
  return (
    input.ids.length > 0 && input.ids.every((id) => input.selected.includes(id))
  );
}
