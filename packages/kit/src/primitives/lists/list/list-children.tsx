import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import type { ListPosition, ListSelection } from '../../../list-context';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
import type { ChildrenOptions } from './list-children-options';
import { sectionEntries, menuEntries } from './list-section-entries';
import {
  listTree,
  prepareChildren,
  type ListBlock,
} from './list-section-model';
import type { TreeFolding } from './list-tree-rows';

export interface ListChild extends ListSelection {
  key: string;
  // The row's own `id`, which a move reports.
  rowId?: string;
  fullSpan?: boolean;
  content: ReactNode;
  position: ListPosition;
}

interface PreparedChildren {
  blocks: ListBlock[];
  items: ListChild[];
  shelves: boolean;
  lanes: boolean;
}

// Lanes are drawn only where a tree is: on a wide desktop or web window, outside a menu. Elsewhere the Sections stack as a List's do.
export const drawsLanes = (
  layout: ChildrenOptions['layout'],
  look: Pick<ListLook, 'treeDrawn'>,
): boolean => layout === 'lanes' && look.treeDrawn;

export function usePreparedChildren(props: ChildrenOptions): PreparedChildren {
  const look = useListLook();
  const blocks = useChildBlocks(props.children);

  const shelves = hasShelves(props, blocks);
  const lanes = drawsLanes(props.layout, look) && hasSections(blocks);

  const entries = useMemo(
    () => (shelves || lanes ? [] : sectionEntries(blocks)),
    [blocks, shelves, lanes],
  );

  return {
    blocks,
    shelves,
    lanes,
    items: look.menu ? menuEntries(entries) : entries,
  };
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

function useChildBlocks(children: ReactNode): ListBlock[] {
  const id = useId();
  const folding = useFolding();
  const { footerShown } = useListLook();

  return useMemo(
    () =>
      prepareChildren(children, id, listTree(children, folding, footerShown)),
    [children, id, folding, footerShown],
  );
}

const hasSections = (blocks: ListBlock[]): boolean =>
  blocks.some((block) => block.kind === 'section');

function hasShelves(props: ChildrenOptions, blocks: ListBlock[]): boolean {
  return props.direction === 'horizontal' && hasSections(blocks);
}
