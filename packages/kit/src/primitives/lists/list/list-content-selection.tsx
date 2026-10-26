import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ListProps } from './list-props';
import { rowId, useSelectionIds } from './list-row-identity';
import { closingActions } from './list-selection-actions';
import { SelectionRange, type RowPress } from './list-selection-model';
import {
  selectionValue,
  type EditMode,
  type SelectionParts,
} from './list-selection-value';

export interface ContentSelection {
  selected: readonly string[];
  active: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  change: (ids: readonly string[]) => void;
  // Clears the selection and leaves edit mode (iOS edit mode, Android contextual mode); on web it only clears.
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

function useEditMode(): EditMode {
  const [editing, setEditing] = useState(false);

  return useMemo(() => ({ editing, setEditing }), [editing]);
}

function useParts(): SelectionParts {
  const [parts] = useState(() => ({
    range: new SelectionRange(),
    locked: new Set<string>(),
  }));

  return parts;
}

type Change = ((ids: readonly string[]) => void) | undefined;

function useClose(onChange: Change, edit: EditMode): () => void {
  const { setEditing } = edit;

  return useCallback((): void => {
    onChange?.([]);
    setEditing(false);
  }, [onChange, setEditing]);
}

// Memoised on what it reads, not on the whole `props`, which is a new object on every render.
function useSelectionBase<Item>(
  props: ListProps<Item>,
  edit: EditMode,
): ContentSelection | null {
  const ids = useSelectionIds(props);
  const parts = useParts();
  const { selected, onChange } = props.selection ?? {};
  const close = useClose(onChange, edit);

  return useMemo(
    () => selectionValue({ ids, selected, onChange, edit, close, parts }),
    [ids, selected, onChange, edit, close, parts],
  );
}

export function useContentSelection<Item>(
  props: ListProps<Item>,
): ContentSelection | null {
  const base = useSelectionBase(props, useEditMode());
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
