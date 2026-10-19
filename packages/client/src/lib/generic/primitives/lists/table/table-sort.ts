import type { TableColumn, TableSort } from './table-props';

const flipped = { ascending: 'descending', descending: 'ascending' } as const;

// A column title sorts by its column; pressing the sorted one again flips the order.
export function nextSort(
  column: TableColumn,
  sort: TableSort | undefined,
): TableSort {
  if (sort?.column !== column.id)
    return { column: column.id, direction: 'ascending' };

  return { column: column.id, direction: flipped[sort.direction] };
}

export function sortLabel(column: TableColumn, sort?: TableSort): string {
  if (sort?.column !== column.id) return column.title;

  return `${column.title}, sorted ${sort.direction}`;
}
