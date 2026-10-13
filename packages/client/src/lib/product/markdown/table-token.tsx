import type { Tokens } from 'marked';
import type * as React from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { markdownMarkClassNames } from '#lib/generic/markdown-marks';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { ClampedBlock } from './clamped-block';
import { InlineTokens } from './inline-tokens';
import type { BlockTokenProps } from './markdown-tokens';

type Cells = Tokens.TableCell[];

function cellClassName(column: number): string {
  return cn(
    'px-3 py-1.5',
    column === 0 ? 'w-[180px] shrink-0' : 'min-w-[180px] flex-1',
  );
}

interface CellProps {
  cell: Tokens.TableCell;
  column: number;
}

function HeaderCell({ cell, column }: CellProps): React.JSX.Element {
  return (
    <View className={cellClassName(column)}>
      <Text className="font-sans font-semibold">
        <InlineTokens
          tokens={cell.tokens}
          codeClassName={markdownMarkClassNames.code}
        />
      </Text>
    </View>
  );
}

function BodyCell({ cell, column }: CellProps): React.JSX.Element {
  return (
    <View className={cellClassName(column)}>
      <Text role="body" className="font-sans">
        <InlineTokens
          tokens={cell.tokens}
          codeClassName="type-code text-foreground"
        />
      </Text>
    </View>
  );
}

interface RowProps {
  cells: Cells;
  className: string;
  Cell: ComponentType<CellProps>;
}

function Row({ cells, className, Cell }: RowProps): React.JSX.Element {
  return (
    <View className={className}>
      {withOccurrenceKeys(cells, (cell) => cell.text).map(
        ({ item: cell, key }, column) => (
          <Cell key={key} cell={cell} column={column} />
        ),
      )}
    </View>
  );
}

function rowKey(row: Cells): string {
  return row.map((cell) => cell.text).join('|');
}

function TableFrame({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <View className="overflow-hidden rounded-2xl border border-border">
      <ScrollView
        horizontal
        contentContainerClassName="min-w-full"
        showsHorizontalScrollIndicator={false}
      >
        <View className="flex-1">{children}</View>
      </ScrollView>
    </View>
  );
}

function BodyRows({ rows }: { rows: Cells[] }): React.JSX.Element[] {
  const last = rows.length - 1;
  return withOccurrenceKeys(rows, rowKey).map(({ item: row, key }, index) => (
    <Row
      key={key}
      cells={row}
      Cell={BodyCell}
      className={cn('flex-row', index < last && 'border-b border-border')}
    />
  ));
}

function Table({ token }: { token: Tokens.Table }): React.JSX.Element {
  return (
    <TableFrame>
      <Row
        cells={token.header}
        Cell={HeaderCell}
        className="flex-row border-b border-border bg-sidebar"
      />
      <BodyRows rows={token.rows} />
    </TableFrame>
  );
}

export function TableToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Table>): React.JSX.Element {
  return (
    <ClampedBlock caret={caret}>
      <Table token={token} />
    </ClampedBlock>
  );
}
