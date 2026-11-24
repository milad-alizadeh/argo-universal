import { cloneElement, isValidElement, type ReactNode } from 'react';
import { flatChildren, flattenedChildren } from '../../../flattened-children';
import { sectionNodeOf, withRows } from './list-entries';
import type { ListProps } from './list-props';
import { unfilteredMove } from './list-search-moves';
import { listTree, readList } from './list-section-model';
import { keptContents, type TreeFolding } from './list-tree-rows';

type SearchRow = {
  title?: string;
  subtitle?: string;
  value?: string;
  children?: ReactNode;
};

function matches(node: ReactNode, query: string): boolean {
  if (!isValidElement<SearchRow>(node)) return false;

  return [node.props.title, node.props.subtitle, node.props.value].some(
    (text) => text?.toLocaleLowerCase().includes(query),
  );
}

function filteredChild(child: ReactNode, query: string): ReactNode[] {
  const section = sectionNodeOf(child);

  if (section) return filteredSection(section, query);

  if (!isValidElement<SearchRow>(child)) return [];

  return filteredRow(child, query);
}

// A Section held as nodes keeps the rows a search matches, and goes when it matches none.
function filteredSection(
  section: NonNullable<ReturnType<typeof sectionNodeOf>>,
  query: string,
): ReactNode[] {
  const rows = filteredChildren(section.props.children, query);

  return rows.length > 0 ? [withRows(section, rows)] : [];
}

// A row with no child rows, whether it has no `children` or an empty list of them, is matched by its own text.
function filteredRow(
  child: React.ReactElement<SearchRow>,
  query: string,
): ReactNode[] {
  if (flattenedChildren(child.props.children).length === 0)
    return matchedChild(child, query);

  const children = filteredChildren(child.props.children, query);

  return children.length > 0 ? [cloneElement(child, {}, children)] : [];
}

function filteredChildren(children: ReactNode, query: string): ReactNode[] {
  return flattenedChildren(children).flatMap((child) =>
    filteredChild(child, query),
  );
}

export function filterList<Item>(
  props: ListProps<Item>,
  text: string,
): ListProps<Item> {
  const query = text.trim().toLocaleLowerCase();

  if (!hasAppQuery(props.searchMode, query)) return props;

  if (props.items === undefined) {
    const children = flatChildren(filteredChildren(props.children, query));

    return { ...props, children, onMove: searchedMove(props, children) };
  }

  return {
    ...props,
    items: matchingItems(props.items, props.renderItem, query),
  };
}

const matchingItems = <Item,>(
  items: readonly Item[],
  renderItem: (item: Item, index: number) => ReactNode,
  query: string,
): Item[] =>
  items.filter((item, index) => matches(renderItem(item, index), query));

function matchedChild(child: ReactNode, query: string): ReactNode[] {
  return matches(child, query) ? [child] : [];
}

function hasAppQuery(
  mode: ListProps<never>['searchMode'],
  query: string,
): boolean {
  return mode === 'app' && query !== '';
}

// A reading of its own each time, so it keeps no rows between searches.
const allOpen = (): TreeFolding => ({
  folded: new Set<string>(),
  toggle: (): void => {},
  drawn: false,
  kept: keptContents(),
});

// The movable rows of `children`, Section by Section, as a List with `onMove` reads them.
const orderOf = (
  children: ReactNode,
): ReturnType<typeof readList>['sections'] =>
  readList(
    children,
    { prefix: 'search', tree: listTree(children, allOpen(), true) },
    (owners) => owners,
  ).sections;

// A search shows some rows; a move among them reaches the owner counted in its full order.
const searchedMove = (
  { children, onMove }: Pick<ListProps<never>, 'children' | 'onMove'>,
  shown: ReactNode,
): ListProps<never>['onMove'] =>
  onMove &&
  ((move) => onMove(unfilteredMove(orderOf(children), orderOf(shown), move)));
