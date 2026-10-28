import {
  isValidElement,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { flattenedChildren } from '../../../flattened-children';
import { childRows } from '../../../list-tree';
import type { ListProps } from './list-props';

type Row = { id?: string; disabled?: boolean; children?: ReactNode };

// A row with an id is one row, followed by any child ListItems nested under it.
function childId(child: ReactNode): string[] {
  if (!isValidElement<Row>(child)) return [];

  return [...ownIds(child.props), ...nestedIds(child)];
}

function ownIds(props: Row): string[] {
  return props.disabled ? [] : rowChildIds(props);
}

// A wrapper without an id already counted its children among its own ids.
function nestedIds(child: ReactElement<Row>): string[] {
  return child.props.id === undefined ? [] : childRows(child).flatMap(childId);
}

function childIds(children: ReactNode): string[] {
  return flattenedChildren(children).flatMap(childId);
}

export type IdentityProps<Item> = Pick<
  ListProps<Item>,
  | 'items'
  | 'children'
  | 'renderItem'
  | 'getSelectionId'
  | 'keyExtractor'
  | 'getItemType'
>;

// A row's id, in one order for the List's own ids and for the row itself: the `id` its ListItem carries, else the one the List derives (`getSelectionId`, then `keyExtractor`).
export function rowId(
  own: string | undefined,
  derived: string | undefined,
): string | undefined {
  return own ?? derived;
}

export function selectionId<Item>(
  props: IdentityProps<Item>,
  item: Item,
  index: number,
): string | undefined {
  if (props.getSelectionId) return props.getSelectionId(item);

  return props.keyExtractor?.(item, index);
}

export function selectionIds<Item>(props: IdentityProps<Item>): string[] {
  if (props.items === undefined) return childIds(props.children);

  return props.items.flatMap((item, index) =>
    dataRowIds({ props, item, index }),
  );
}

interface DataRow<Item> {
  props: IdentityProps<Item>;
  item: Item;
  index: number;
}

function dataRowIds<Item>(data: DataRow<Item>): string[] {
  const { props, item, index } = data;
  const row = renderRow(props, item, index);

  if (unselectable(data, row)) return [];

  const id = rowId(renderedId(row), selectionId(props, item, index));

  return id === undefined ? [] : [id];
}

function disabledRow(row: ReactNode): boolean {
  return isValidElement<Row>(row) && row.props.disabled === true;
}

// A header, footer or gap the caller renders as an item is never a row to select, whatever props it carries.
export const sectionPart = <Item>(
  props: Pick<ListProps<Item>, 'getItemType'>,
  item: Item,
  index: number,
): boolean => props.getItemType?.(item, index) === 'section';

const unselectable = <Item>(
  { props, item, index }: DataRow<Item>,
  row: ReactNode,
): boolean => sectionPart(props, item, index) || disabledRow(row);

// A rendered row's own `id`: the identity its selection and its move report, and a List.Section's.
export function renderedId(row: ReactNode): string | undefined {
  return isValidElement<Row>(row) ? row.props.id : undefined;
}

function renderRow<Item>(
  props: IdentityProps<Item>,
  item: Item,
  index: number,
): ReactNode {
  return props.renderItem?.(item, index);
}

function rowChildIds(props: Row): string[] {
  return props.id === undefined ? childIds(props.children) : [props.id];
}

function useIdentity<Item>(props: IdentityProps<Item>): IdentityProps<Item> {
  const { items, children, renderItem, getSelectionId, keyExtractor } = props;
  const { getItemType } = props;

  return useMemo(
    () => ({
      items,
      children,
      renderItem,
      getSelectionId,
      keyExtractor,
      getItemType,
    }),
    [items, children, renderItem, getSelectionId, keyExtractor, getItemType],
  );
}

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

// The same array while the ids are the same ones, so an inline `renderItem` or children do not make every consumer start over.
function useStableIds(ids: readonly string[]): readonly string[] {
  const [stable, setStable] = useState(ids);
  const same = sameIds(stable, ids);

  if (!same) setStable(ids);

  return same ? stable : ids;
}

const noIds: string[] = [];

// The ids Select All and a range can reach, read again only when what they come from changes.
export function useSelectionIds<Item>(
  props: ListProps<Item>,
): readonly string[] {
  const identity = useIdentity(props);
  const enabled = props.selection !== undefined;

  const ids = useMemo(
    () => (enabled ? selectionIds(identity) : noIds),
    [enabled, identity],
  );

  return useStableIds(ids);
}
