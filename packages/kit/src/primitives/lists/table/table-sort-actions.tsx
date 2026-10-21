import type { ReactElement } from 'react';
import { Action, ActionList } from '#primitives/actions/action-list';
import type { TableColumn, TableProps, TableSort } from './table-props';

type SortProps = Pick<TableProps, 'columns' | 'sort' | 'onSortChange'>;

type Choose = (sort: TableSort) => void;

const directions = [
  { direction: 'ascending', label: 'Ascending' },
  { direction: 'descending', label: 'Descending' },
] as const;

// Sort by ›, for the header: the sortable columns with a check on the current one, then the direction.
export function TableSortActions(props: SortProps): ReactElement | null {
  const sortable = props.columns.filter((column) => column.sortable);

  if (sortable.length === 0 || !props.onSortChange) return null;

  const choices = { sortable, sort: props.sort, choose: props.onSortChange };

  return (
    <ActionList>
      <Action key="sort" label="Sort by" icon="chevron-up-down">
        {columnChoices(choices)}
        {directionChoices(choices)}
      </Action>
    </ActionList>
  );
}

interface ChoiceProps {
  sortable: readonly TableColumn[];
  sort?: TableSort;
  choose: Choose;
}

// Called, not rendered: ActionList reads its sections from its children's element types.
function columnChoices({ sortable, sort, choose }: ChoiceProps): ReactElement {
  return (
    <ActionList.Section key="columns">
      {sortable.map((column) => (
        <Action
          key={column.id}
          label={column.title}
          selected={sort?.column === column.id}
          onPress={() => choose(columnSort(column, sort))}
        />
      ))}
    </ActionList.Section>
  );
}

// Ascending or descending on the sorted column, or on the first sortable one before any sort.
const firstColumn = (sortable: readonly TableColumn[]): string =>
  sortable[0]?.id ?? '';

const sortedColumn = ({ sortable, sort }: ChoiceProps): string =>
  sort?.column ?? firstColumn(sortable);

function directionChoices({ sort, ...props }: ChoiceProps): ReactElement {
  const column = sortedColumn({ ...props, sort });

  return (
    <ActionList.Section key="direction">
      {directions.map(({ direction, label }) => (
        <Action
          key={direction}
          label={label}
          selected={sort?.direction === direction}
          onPress={() => props.choose({ column, direction })}
        />
      ))}
    </ActionList.Section>
  );
}

const columnSort = (column: TableColumn, sort?: TableSort): TableSort => ({
  column: column.id,
  direction: sort?.direction ?? 'ascending',
});
