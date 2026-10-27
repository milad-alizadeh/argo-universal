import {
  useCallback,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  childTree,
  ListTreeContext,
  useTreeDrawn,
  useTreeRow,
  type TreeRow,
} from '../../../list-tree';

type ParentRow = TreeRow & { parent: NonNullable<TreeRow['parent']> };

const topRow: TreeRow = { depth: 0, through: [], last: true };

// This row's place as a parent, under whichever row holds it; a flat drawing never folds it.
function useParentRow(): ParentRow {
  const [open, setOpen] = useState(true);
  const drawn = useTreeDrawn();
  const above = useTreeRow() ?? topRow;
  const toggle = useCallback(() => setOpen((current) => !current), []);

  return { ...above, parent: { open: open || !drawn, toggle } };
}

function ChildRows(props: {
  tree: TreeRow;
  rows: readonly ReactElement[];
}): ReactNode {
  const { tree, rows } = props;

  return rows.map((row, index) => (
    <ListTreeContext
      key={row.key}
      value={childTree(tree, index === rows.length - 1)}
    >
      {row}
    </ListTreeContext>
  ));
}

/*
 * A row that still holds its child ListItems, where no List lifted them out, such as a data List's rendered row: it
 * draws them after itself and folds them with its own chevron, open at first.
 */
export function NestingItem(props: {
  row: ReactElement;
  rows: readonly ReactElement[];
}): ReactElement {
  const tree = useParentRow();

  return (
    <>
      <ListTreeContext value={tree}>{props.row}</ListTreeContext>
      {tree.parent.open ? <ChildRows tree={tree} rows={props.rows} /> : null}
    </>
  );
}
