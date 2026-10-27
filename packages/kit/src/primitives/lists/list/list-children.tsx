import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import type { ListPosition, ListSelection } from '../../../list-context';
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
  fullSpan?: boolean;
  content: ReactNode;
  position: ListPosition;
}

interface PreparedChildren {
  blocks: ListBlock[];
  items: ListChild[];
  shelves: boolean;
}

export function usePreparedChildren(props: ChildrenOptions): PreparedChildren {
  const { menu } = useListLook();
  const blocks = useChildBlocks(props.children);

  const shelves = hasShelves(props, blocks);

  const entries = useMemo(
    () => (shelves ? [] : sectionEntries(blocks)),
    [blocks, shelves],
  );

  return { blocks, shelves, items: menu ? menuEntries(entries) : entries };
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

function hasShelves(props: ChildrenOptions, blocks: ListBlock[]): boolean {
  return (
    props.direction === 'horizontal' &&
    blocks.some((block) => block.kind === 'section')
  );
}
