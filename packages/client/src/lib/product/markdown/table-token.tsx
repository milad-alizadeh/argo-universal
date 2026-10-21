import type { Tokens } from 'marked';
import type * as React from 'react';
import type { ComponentType, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { markdownMarkClassNames } from '#lib/generic/markdown-marks';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { trayCardClassName, trayClassName } from '#lib/generic/tray-surface';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import { ClampedBlock } from './clamped-block';
import { InlineTokens } from './inline-tokens';
import type { BlockTokenProps } from './markdown-tokens';

type Cells = Tokens.TableCell[];

function cellClassName(column: number): string {
  return cn('px-3 py-1.5', column === 0 ? 'w-45 shrink-0' : 'min-w-45 flex-1');
}

interface CellProps {
  cell: Tokens.TableCell;
  column: number;
}

// The column titles sit on the tray's strip, secondary and muted, as the Table primitive draws them.
function HeaderCell({ cell, column }: CellProps): React.JSX.Element {
  return (
    <View className={cellClassName(column)}>
      <Text role="secondary" tone="muted" numberOfLines={1}>
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

/*
 * The same tray a code block and the Table primitive sit on: the tint shows through beside the titles
 * as the header strip, and the rows ride on the card inset inside it. The scroll is within the tray, so
 * a wide table slides under a strip that stays put.
 */
function TableFrame({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <View className={trayClassName}>
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
  return withOccurrenceKeys(rows, rowKey).map(({ item: row, key }) => (
    <Row key={key} cells={row} Cell={BodyCell} className="flex-row" />
  ));
}

function Table({ token }: { token: Tokens.Table }): React.JSX.Element {
  return (
    <TableFrame>
      <Row
        cells={token.header}
        Cell={HeaderCell}
        className="h-8 flex-row items-center"
      />
      <View className={trayCardClassName}>
        <BodyRows rows={token.rows} />
      </View>
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
