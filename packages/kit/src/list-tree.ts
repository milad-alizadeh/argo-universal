import {
  createContext,
  isValidElement,
  use,
  type JSXElementConstructor,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { flattenedChildren } from './flattened-children';
import { useInMenu } from './menu-rows-context';
import { useWide } from './use-wide/use-wide';

/*
 * A row's place in a List's tree of ListItems (child ListItems nest under their parent). The List flattens the tree,
 * so every row is its own cell on LegendList, and hands each row this to draw its tree lane: one 16 lane per level,
 * a fold chevron on a parent, a rail beside a child, and an elbow on a last child.
 */
export interface TreeRow {
  // 0 for a top-level row.
  depth: number;
  // For each ancestor lane before the parent's: whether that ancestor's rail runs on past this row.
  through: readonly boolean[];
  // The last child of its parent: its rail ends in an elbow.
  last: boolean;
  // Set on a row that holds child ListItems.
  parent?: { open: boolean; toggle: () => void };
}

export const ListTreeContext = createContext<TreeRow | null>(null);

// A child's place under its parent: one level deeper, carrying on the rails of the parent's own ancestors.
export function childTree(parent: TreeRow, last: boolean): TreeRow {
  return {
    depth: parent.depth + 1,
    through: parent.depth === 0 ? [] : [...parent.through, !parent.last],
    last,
  };
}

export const useTreeRow = (): TreeRow | null => use(ListTreeContext);

// The components whose child ListItems nest under them; ListItem registers itself, so the List never imports it.
type RowComponent = JSXElementConstructor<never>;

const nestingTypes = new WeakSet<RowComponent>();

export function nestsChildren(type: RowComponent): void {
  nestingTypes.add(type);
}

type RowElement = ReactElement<{ children?: ReactNode }>;

const nestingRow = (child: ReactNode): child is RowElement =>
  isValidElement(child) &&
  typeof child.type !== 'string' &&
  nestingTypes.has(child.type);

// The ListItems written inside a row.
export const nestedRows = (children: ReactNode): ReactElement[] =>
  flattenedChildren(children).filter(isValidElement);

// A row's child ListItems, or none when it is not a row that nests.
export function childRows(child: ReactNode): ReactElement[] {
  if (!nestingRow(child)) return [];

  return nestedRows(child.props.children);
}

/*
 * Only a wide desktop or web window draws the tree: lanes, rails and folding. Phones and narrow windows draw every
 * child flat after its parent, with no indent (Paper "Issue row", phone board), and a popover's menu rows stay flat.
 */
export function useTreeDrawn(): boolean {
  const wide = useWide();
  const menu = useInMenu();

  return Platform.OS === 'web' && wide && !menu;
}
