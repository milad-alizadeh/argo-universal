import type { TreeRow } from '@repo/kit/list-tree';
import { useCallback, useMemo, useState } from 'react';
import type { SessionsListEntry } from '../sessions-list-entries';
import { useListEntries } from './sessions-list-entries-state';
import { visibleSessionEntries } from './sessions-list-nesting';
import type { SessionsListProps } from './sessions-list-props';

export interface SessionNesting {
  folded: ReadonlySet<string>;
  toggle: (id: string) => void;
}

const unfolded: ReadonlySet<string> = new Set();

function toggleId(
  current: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(current);

  if (next.has(id)) next.delete(id);
  else next.add(id);

  return next;
}

export function useSessionNesting(wide: boolean): SessionNesting {
  const [folded, setFolded] = useState(unfolded);

  const toggle = useCallback(
    (id: string) => setFolded((current) => toggleId(current, id)),
    [],
  );

  return useMemo(
    () => ({ folded: wide ? folded : unfolded, toggle }),
    [wide, folded, toggle],
  );
}

function useVisibleEntries(
  entries: SessionsListEntry[],
  { folded }: SessionNesting,
): SessionsListEntry[] {
  return useMemo(
    () => visibleSessionEntries(entries, folded),
    [entries, folded],
  );
}

// The same kit tree lanes and fold control as nested Issue rows, with each Session kept in its own virtualized cell.
export function sessionTree(
  entry: Extract<SessionsListEntry, { kind: 'session' }>,
  nesting: SessionNesting,
): TreeRow | undefined {
  const tree = entry.tree;

  if (!tree) return undefined;

  return {
    ...tree,
    parent: tree.hasChildren ? parentLane(entry.id, nesting) : undefined,
  };
}

function parentLane(
  id: string,
  nesting: SessionNesting,
): NonNullable<TreeRow['parent']> {
  return { open: !nesting.folded.has(id), toggle: () => nesting.toggle(id) };
}

export function useNestedEntries(
  props: SessionsListProps,
  collapsed: ReadonlySet<string>,
  nesting: SessionNesting,
): SessionsListEntry[] {
  return useVisibleEntries(useListEntries(props, collapsed), nesting);
}
