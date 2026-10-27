import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useListLook } from '../../../list-look-context';
import type { ListProps } from './list-props';
import { rowId, useSelectionIds } from './list-row-identity';
import { closingActions } from './list-selection-actions';
import { SelectionRange, type RowPress } from './list-selection-model';
import {
  selectionValue,
  type SelectingState,
  type SelectionParts,
} from './list-selection-value';

export interface ContentSelection {
  selected: readonly string[];
  active: boolean;
  selecting: boolean;
  setSelecting: (selecting: boolean) => void;
  change: (ids: readonly string[]) => void;
  // Clears the selection and ends Selection mode (iOS edit mode, Android contextual mode); on web it only clears.
  close: () => void;
  press: (press: RowPress) => void;
  longPress: (id: string) => void;
  all: () => void;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  coversSeparator: (id: string) => boolean;
  // A rendered row that is disabled says so, so Select All and a range skip it even when the element `renderItem` returned does not carry `disabled`. Returns the undo.
  lock: (id: string | undefined) => () => void;
  actions?: ReactNode;
}

interface ContentRowSelection {
  selection: ContentSelection | null;
  id: string | undefined;
}

export const ContentSelectionContext = createContext<ContentSelection | null>(
  null,
);

export const ContentRowId = createContext<string | undefined>(undefined);

function useSelectingState(): SelectingState {
  const [selecting, setSelecting] = useState(false);

  return useMemo(() => ({ selecting, setSelecting }), [selecting]);
}

function useParts(): SelectionParts {
  const [parts] = useState(() => ({
    range: new SelectionRange(),
    locked: new Set<string>(),
  }));

  return parts;
}

type Change = ((ids: readonly string[]) => void) | undefined;

interface Chosen {
  ids: readonly string[];
  selected: readonly string[] | undefined;
  onChange: Change;
}

function useClose(
  onChange: Change,
  mode: SelectingState,
  parts: SelectionParts,
): () => void {
  const { setSelecting } = mode;

  return useCallback((): void => {
    onChange?.([]);
    setSelecting(false);
    parts.range.reset();
  }, [onChange, setSelecting, parts]);
}

function pruned(
  ids: readonly string[],
  selected: readonly string[],
): readonly string[] {
  const shown = new Set(ids);

  return selected.every((id) => shown.has(id))
    ? selected
    : selected.filter((id) => shown.has(id));
}

const changeTo = (onChange: Change, ids: readonly string[] | undefined): void =>
  onChange?.(ids ?? []);

// Rows that left the List (filtered out, collapsed, archived elsewhere) leave the selection too, so the count and the Actions cover only rows the reader can see.
function usePresentSelection(
  ids: readonly string[],
  selected: readonly string[] | undefined,
  onChange: Change,
): readonly string[] | undefined {
  const present = useMemo(
    () => selected && pruned(ids, selected),
    [ids, selected],
  );

  useEffect(() => {
    if (present !== selected) changeTo(onChange, present);
  }, [present, selected, onChange]);

  return present;
}

function useChosen<Item>(props: ListProps<Item>): Chosen {
  const ids = useSelectionIds(props);
  const { onChange } = props.selection ?? {};
  const shown = usePresentSelection(ids, props.selection?.selected, onChange);

  return { ids, selected: shown, onChange };
}

// Memoised on what it reads, not on the whole `props`, which is a new object on every render.
function useSelectionBase<Item>(
  props: ListProps<Item>,
  mode: SelectingState,
): ContentSelection | null {
  const { ids, selected, onChange } = useChosen(props);
  const parts = useParts();
  const close = useClose(onChange, mode, parts);
  const pointer = useListLook().pointerSelection;

  return useMemo(
    () =>
      selectionValue({ ids, selected, onChange, mode, close, parts, pointer }),
    [ids, selected, onChange, mode, close, parts, pointer],
  );
}

export function useContentSelection<Item>(
  props: ListProps<Item>,
): ContentSelection | null {
  const base = useSelectionBase(props, useSelectingState());
  const { actions } = props;

  return useMemo(
    () => base && { ...base, actions: closingActions(actions, base.close) },
    [base, actions],
  );
}

export function useContentRowSelection(id?: string): ContentRowSelection {
  const selection = useContext(ContentSelectionContext);
  const derived = useContext(ContentRowId);

  return { selection, id: rowId(id, derived) };
}
