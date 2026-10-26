import { isValidElement, type ReactNode } from 'react';
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

export function selectionId<Item>(
  props: ListProps<Item>,
  item: Item,
  index: number,
): string | undefined {
  if (props.getSelectionId) return props.getSelectionId(item);

  return props.keyExtractor?.(item, index);
}

export function selectionIds<Item>(props: ListProps<Item>): string[] {
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
  props: ListProps<Item>;
  item: Item;
  index: number;
}): string[] {
  const row = renderRow(props, item, index);

  if (disabledRow(row)) return [];
  const id = rowIdentity(row, selectionId(props, item, index));

  return id === undefined ? [] : [id];
}

function disabledRow(row: ReactNode): boolean {
  return isValidElement<Row>(row) && row.props.disabled === true;
}

function renderedId(row: ReactNode): string | undefined {
  return isValidElement<Row>(row) ? row.props.id : undefined;
}

function renderRow<Item>(
  props: ListProps<Item>,
  item: Item,
  index: number,
): ReactNode {
  return props.renderItem?.(item, index);
}

function rowIdentity(row: ReactNode, fallback?: string): string | undefined {
  return renderedId(row) ?? fallback;
}

function rowChildIds(props: Row): string[] {
  return props.id === undefined ? childIds(props.children) : [props.id];
}
