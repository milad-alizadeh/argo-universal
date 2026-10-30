import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import type { ListPosition, ListSelection } from '../../../list-context';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import type { ChildrenOptions } from './list-children-options';
import type { ListTree } from './list-level-entries';
import type { RowId } from './list-move-model';
import { sectionEntries, menuEntries } from './list-section-entries';
import { listTree, readList, type ListBlock } from './list-section-model';
import type { TreeFolding } from './list-tree-rows';

export interface ListChild extends ListSelection {
  key: string;
  // The row's own `id`, which a move reports; only a row the List can move carries it.
  moveId?: RowId;
  fullSpan?: boolean;
  content: ReactNode;
  position: ListPosition;
}

export interface PreparedChildren {
  blocks: ListBlock[];
  items: ListChild[];
  shelves: boolean;
  // Lanes draw only for a List with Sections, so a drag over them always has a Section to land in.
  lanes: boolean;
  // The key of the rows outside any Section, as the List's moves name them.
  looseKey: string;
}

// Lanes are drawn only where a tree is: on a wide desktop or web window, outside a menu. Elsewhere the Sections stack as a List's do.
const drawsLanes = (
  layout: ChildrenOptions['layout'],
  look: Pick<ListLook, 'treeDrawn'>,
): boolean => layout === 'lanes' && look.treeDrawn;

// How the List draws the blocks it read: in one column, on shelves, or in lanes, decided here once.
export function usePrepared(
  props: ChildrenOptions,
  blocks: ListBlock[],
  looseKey: string,
): PreparedChildren {
  const look = useListLook();
  const shelves = hasShelves(props, blocks);
  const lanes = drawsLanes(props.layout, look) && hasSections(blocks);

  const items = useMemo(
    () => (shelves || lanes ? [] : shownEntries(look, blocks)),
    [look, blocks, shelves, lanes],
  );

  return { blocks, shelves, lanes, items, looseKey };
}

export function usePreparedChildren(props: ChildrenOptions): PreparedChildren {
  const { children } = props;
  const reader = useListReader(children);

  const { blocks } = useMemo(
    () => readList(children, reader),
    [children, reader],
  );

  return usePrepared(props, blocks, reader.prefix);
}

function shownEntries(look: ListLook, blocks: ListBlock[]): ListChild[] {
  const entries = sectionEntries(blocks);

  return look.menu ? menuEntries(entries) : entries;
}

const noneFolded: ReadonlySet<string> = new Set();

// The List owns which parents are folded: every parent starts open, and its chevron folds it.
function useFolding(): TreeFolding {
  const [folded, setFolded] = useState(noneFolded);
  const { treeDrawn: drawn } = useListLook();

  const toggle = useCallback(
    (key: string) =>
      setFolded((current) => {
        const next = new Set(current);

        if (!next.delete(key)) next.add(key);

        return next;
      }),
    [],
  );

  return useMemo(() => ({ folded, toggle, drawn }), [folded, toggle, drawn]);
}

// How one List reads its children: under its own key, as its rows fold.
export interface ListReader {
  prefix: string;
  tree: ListTree;
}

export function useListReader(children: ReactNode): ListReader {
  const prefix = useId();
  const folding = useFolding();
  const { footerShown } = useListLook();

  return useMemo(
    () => ({ prefix, tree: listTree(children, folding, footerShown) }),
    [children, prefix, folding, footerShown],
  );
}

const hasSections = (blocks: ListBlock[]): boolean =>
  blocks.some((block) => block.kind === 'section');

function hasShelves(props: ChildrenOptions, blocks: ListBlock[]): boolean {
  return props.direction === 'horizontal' && hasSections(blocks);
}
