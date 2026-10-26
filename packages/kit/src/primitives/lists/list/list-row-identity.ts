import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListProps } from './list-props';

type Row = { id?: string; disabled?: boolean; children?: ReactNode };

function childId(child: ReactNode): string[] {
  if (!isValidElement<Row>(child)) return [];

  if (child.props.disabled) return [];

  return rowChildIds(child.props);
}

function childIds(children: ReactNode): string[] {
  return flattenedChildren(children).flatMap(childId);
}

export type IdentityProps<Item> = Pick<
  ListProps<Item>,
  'items' | 'children' | 'renderItem' | 'getSelectionId' | 'keyExtractor'
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

function dataRowIds<Item>({
  props,
  item,
  index,
}: {
  props: IdentityProps<Item>;
  item: Item;
  index: number;
}): string[] {
  const row = renderRow(props, item, index);

  if (disabledRow(row)) return [];
  const id = rowId(renderedId(row), selectionId(props, item, index));

  return id === undefined ? [] : [id];
}

function disabledRow(row: ReactNode): boolean {
  return isValidElement<Row>(row) && row.props.disabled === true;
}

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

  return useMemo(
    () => ({ items, children, renderItem, getSelectionId, keyExtractor }),
    [items, children, renderItem, getSelectionId, keyExtractor],
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
