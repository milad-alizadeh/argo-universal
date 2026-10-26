import { Platform } from 'react-native';
import type { ContentSelection } from './list-content-selection';
import {
  selectWebRow,
  toggleSelected,
  type RowPress,
  type SelectionInput,
  type SelectionRange,
} from './list-selection-model';

export interface SelectingState {
  selecting: boolean;
  setSelecting: (selecting: boolean) => void;
}

// What the List holds for its whole life: the Shift-click anchor and the ids of rows that said they are disabled.
export interface SelectionParts {
  range: SelectionRange;
  locked: Set<string>;
}

export interface SelectionSetup {
  ids: readonly string[];
  selected: readonly string[] | undefined;
  onChange?: (ids: readonly string[]) => void;
  mode: SelectingState;
  close: () => void;
  parts: SelectionParts;
}

// What a change of `selected` or of the ids needs once, so each row asks in constant time.
interface Lookup {
  chosen: ReadonlySet<string>;
  next: ReadonlyMap<string, string>;
}

function lookup(ids: readonly string[], selected: readonly string[]): Lookup {
  const next = new Map<string, string>();

  for (const [index, id] of ids.entries()) {
    const following = ids[index + 1];

    if (following !== undefined) next.set(id, following);
  }

  return { chosen: new Set(selected), next };
}

function coversNext(found: Lookup, id: string): boolean {
  const next = found.next.get(id);

  return next !== undefined && found.chosen.has(id) && found.chosen.has(next);
}

const keep = (): void => {};

function lockRow(locked: Set<string>, id: string | undefined): () => void {
  if (id === undefined) return keep;
  locked.add(id);

  return (): void => {
    locked.delete(id);
  };
}

function beginSelection(
  input: SelectionInput,
  mode: SelectingState,
  id: string,
): void {
  mode.setSelecting(true);
  input.change([...new Set([...input.selected, id])]);
}

function unlocked(
  ids: readonly string[],
  locked: ReadonlySet<string>,
): string[] {
  return ids.filter((id) => !locked.has(id));
}

function selectionInput(setup: Chosen): SelectionInput {
  const { ids, selected, onChange, parts } = setup;

  return {
    ids,
    selected,
    change: (next) => onChange?.(unlocked(next, parts.locked)),
  };
}

// A phone toggles the pressed row; the web adds modifier keys, ranges and activation.
function selectRow(
  input: SelectionInput,
  range: SelectionRange,
  press: RowPress,
): void {
  if (Platform.OS === 'web') selectWebRow(input, range, press);
  else toggleSelected(input, press.id);
}

function rowControls(
  setup: Chosen,
  input: SelectionInput,
  found: Lookup,
): Pick<ContentSelection, 'press' | 'longPress' | 'all' | 'coversSeparator'> {
  const { parts, mode } = setup;

  return {
    press: (press) => selectRow(input, parts.range, press),
    longPress: (id) => beginSelection(input, mode, id),
    all: () => input.change(input.ids),
    coversSeparator: (id) => coversNext(found, id),
  };
}

function allSelected(setup: Chosen, found: Lookup): boolean {
  const rows = unlocked(setup.ids, setup.parts.locked);

  return rows.length > 0 && rows.every((id) => found.chosen.has(id));
}

// Null when the List has no `selection`.
export function selectionValue(setup: SelectionSetup): ContentSelection | null {
  const { selected } = setup;

  return selected === undefined ? null : valueOf({ ...setup, selected });
}

type Chosen = SelectionSetup & { selected: readonly string[] };

function valueOf(setup: Chosen): ContentSelection {
  const input = selectionInput(setup);
  const found = lookup(setup.ids, setup.selected);

  return {
    ...setup.mode,
    selected: setup.selected,
    allSelected: allSelected(setup, found),
    change: input.change,
    close: setup.close,
    active: Platform.OS === 'web' || setup.mode.selecting,
    isSelected: (id) => found.chosen.has(id),
    lock: (id) => lockRow(setup.parts.locked, id),
    ...rowControls(setup, input, found),
  };
}
