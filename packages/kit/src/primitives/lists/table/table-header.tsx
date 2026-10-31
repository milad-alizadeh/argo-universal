import type { ReactElement, ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { alignClass, columnClass, columnStyle } from './table-cell';
import type { TableColumn, TableProps, TableSort } from './table-props';
import { nextSort, sortLabel } from './table-sort';

export type HeaderProps = Pick<TableProps, 'columns' | 'sort' | 'onSortChange'>;

// The column titles on the tray: secondary and muted, the sorted one foreground with its direction's chevron.
export function TableHeader(props: HeaderProps): ReactElement {
  return (
    <View role="row" className="h-8 flex-row items-center gap-4 px-3">
      {props.columns.map((column, index) => (
        <HeaderCell
          key={column.id}
          {...props}
          column={column}
          className={columnClass(column, index === 0)}
          style={columnStyle(column)}
        />
      ))}
    </View>
  );
}

type HeaderCellProps = HeaderProps & {
  column: TableColumn;
  className: string;
  style?: ViewStyle;
};

export function HeaderCell(props: HeaderCellProps): ReactElement {
  return (
    <View
      role="columnheader"
      style={props.style}
      className={cn(props.className, alignClass(props.column))}
    >
      <HeaderTitle {...props} />
    </View>
  );
}

const sortButtonClass =
  'max-w-full rounded-sm web:focus-visible:outline-2 web:focus-visible:outline-focus';

type TitleCellProps = HeaderProps & { column: TableColumn };

function HeaderTitle(props: TitleCellProps): ReactElement {
  const { column, onSortChange } = props;

  if (!column.sortable || !onSortChange) return <Title column={column} />;

  return <SortButton {...props} onSortChange={onSortChange} />;
}

function SortButton(
  props: TitleCellProps & Required<Pick<HeaderProps, 'onSortChange'>>,
): ReactElement {
  const { column, sort } = props;

  return (
    <Pressable
      role="button"
      accessibilityLabel={sortLabel(column, sort)}
      onPress={() => props.onSortChange(nextSort(column, sort))}
      className={sortButtonClass}
    >
      <Title column={column} sort={sort} />
    </Pressable>
  );
}

interface TitleProps {
  column: TableColumn;
  sort?: TableSort;
}

const sortedDirection = ({
  column,
  sort,
}: TitleProps): TableSort['direction'] | undefined =>
  sort?.column === column.id ? sort.direction : undefined;

function Title(props: TitleProps): ReactElement {
  const direction = sortedDirection(props);

  return (
    <View className="min-w-0 flex-row items-center gap-1">
      <Text
        role="secondary"
        tone={direction ? undefined : 'muted'}
        numberOfLines={1}
      >
        {headerContent(props.column)}
      </Text>
      {direction ? <SortChevron direction={direction} /> : null}
    </View>
  );
}

const chevrons = {
  ascending: 'chevron-up',
  descending: 'chevron-down',
} as const;

function SortChevron({
  direction,
}: Pick<TableSort, 'direction'>): ReactElement {
  return <Icon name={chevrons[direction]} className="text-foreground" />;
}

const headerContent = (column: TableColumn): ReactNode =>
  column.header ?? column.title;
