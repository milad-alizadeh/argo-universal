import { memo } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { type ChartProps, chartTable } from './chart-data';

const hidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
} as const;

// Cells have no id of their own, so a cell is told apart by where it sits.
const place = (position: number): string => `${position}`;

// Series names may repeat, so a header is told apart by its column too.
function HeaderRow({ columns }: { columns: string[] }): React.JSX.Element {
  return (
    <View role="row">
      {columns.map((column, position) => (
        <Text
          key={place(position)}
          role="body"
          accessibilityRole="columnheader"
        >
          {column}
        </Text>
      ))}
    </View>
  );
}

function BodyRow({ cells }: { cells: string[] }): React.JSX.Element {
  return (
    <View role="row">
      {cells.map((cell, column) => (
        <Text key={place(column)} role="body" accessibilityRole="cell">
          {cell}
        </Text>
      ))}
    </View>
  );
}

// Screen readers read the series as a table; it is laid out off view, like Canvas's shape list.
function Table({ props }: { props: ChartProps }): React.JSX.Element {
  const { columns, rows } = chartTable(props);

  return (
    <View
      role="table"
      accessibilityLabel={`${props.label} data`}
      style={hidden}
    >
      <HeaderRow columns={columns} />
      {rows.map((cells, row) => (
        <BodyRow key={place(row)} cells={cells} />
      ))}
    </View>
  );
}

export const ChartTable = memo(Table);
