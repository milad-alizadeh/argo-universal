import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  Menu,
  MenuTrigger,
  type MenuChoiceGroup,
} from '#primitives/overlays/menu';
import type { TableColumn, TableProps, TableSort } from './table-props';

type SortProps = Pick<TableProps, 'columns' | 'sort' | 'onSortChange'>;

type Choose = (sort: TableSort) => void;

const directions = [
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
] as const;

const sortLabel = 'Sort by';

// Sort by, for compact widths: a Menu of two choices, the sortable columns with a check on the current one, then the direction.
export function TableSortMenu(props: SortProps): ReactElement | null {
  const sortable = props.columns.filter((column) => column.sortable);

  if (sortable.length === 0 || !props.onSortChange) return null;

  const choices = { sortable, sort: props.sort, choose: props.onSortChange };

  return (
    <View className="flex-row justify-end px-4 pb-2">
      <Menu
        accessibilityLabel={sortLabel}
        trigger={<MenuTrigger label={sortLabel} icon="chevron-up-down" />}
        groups={[columnChoices(choices), directionChoices(choices)]}
      />
    </View>
  );
}

interface ChoiceProps {
  sortable: readonly TableColumn[];
  sort?: TableSort;
  choose: Choose;
}

function columnChoices({
  sortable,
  sort,
  choose,
}: ChoiceProps): MenuChoiceGroup {
  return {
    options: sortable.map((column) => ({
      value: column.id,
      label: column.title,
    })),
    value: sort?.column ?? '',
    onValueChange: sortOnColumn({ sortable, sort, choose }),
  };
}

const sortOnColumn =
  ({ sortable, sort, choose }: ChoiceProps) =>
  (value: string): void => {
    const column = sortable.find((candidate) => candidate.id === value);

    if (column) choose(columnSort(column, sort));
  };

// Ascending or descending on the sorted column, or on the first sortable one before any sort.
const firstColumn = (sortable: readonly TableColumn[]): string =>
  sortable[0]?.id ?? '';

const sortedColumn = ({ sortable, sort }: ChoiceProps): string =>
  sort?.column ?? firstColumn(sortable);

function directionChoices({ sort, ...props }: ChoiceProps): MenuChoiceGroup {
  const column = sortedColumn({ ...props, sort });

  return {
    options: directions,
    value: sort?.direction ?? '',
    onValueChange: (value) => {
      const direction = directions.find((choice) => choice.value === value);

      if (direction) props.choose({ column, direction: direction.value });
    },
  };
}

const columnSort = (column: TableColumn, sort?: TableSort): TableSort => ({
  column: column.id,
  direction: sort?.direction ?? 'ascending',
});
