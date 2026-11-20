import type { Token, Tokens } from 'marked';
import type { ReactElement } from 'react';
import { withOccurrenceKeys } from '#kit/occurrence-keys';
import { Text } from '#primitives/content/text';
import { Table, type TableProps } from '#primitives/lists/table';
import { ClampedBlock } from './clamped-block';
import { InlineTokens } from './inline-tokens';
import type { BlockTokenProps } from './markdown-tokens';
import { columnWidths } from './table-widths';

function Cells({ cells }: { cells: Tokens.TableCell[] }): ReactElement[] {
  return withOccurrenceKeys(cells, (cell) => cell.text).map(
    ({ item: cell, key }, column) => (
      <Table.Cell key={key} column={String(column)} text={cell.text}>
        <Text>
          <InlineTokens tokens={cell.tokens} />
        </Text>
      </Table.Cell>
    ),
  );
}

// A pipe table names no widths, so its own text decides each column's share.
const tableTexts = (token: Tokens.Table): string[][] => [
  token.header.map((cell) => cell.text),
  ...token.rows.map((row) => row.map((cell) => cell.text)),
];

function tableColumns(token: Tokens.Table): TableProps['columns'] {
  const widths = columnWidths(tableTexts(token));

  return token.header.map((cell, index) => ({
    id: String(index),
    title: inlineText(cell.tokens),
    header: <InlineTokens tokens={cell.tokens} />,
    ...widths[index],
    align:
      token.align[index] === 'right' ? ('end' as const) : ('start' as const),
  }));
}

// A Markdown table grows in source order. Each successive row keeps its key as any cell changes.
function tableRows(token: Tokens.Table): ReactElement[] {
  return withOccurrenceKeys(token.rows, () => 'row').map(
    ({ item: cells, key }) => (
      <Table.Row key={key} id={key}>
        {Cells({ cells })}
      </Table.Row>
    ),
  );
}

// Pipe tables use the same scrolling Table as Plugin content.
export function TableToken({
  token,
}: BlockTokenProps<Tokens.Table>): ReactElement {
  return (
    <ClampedBlock>
      <Table columns={tableColumns(token)} overflow="scroll">
        {tableRows(token)}
      </Table>
    </ClampedBlock>
  );
}

function inlineText(tokens: Token[]): string {
  return tokens.map(tokenText).join('');
}

function tokenText(token: Token): string {
  if (!('tokens' in token)) return tokenPlainText(token);

  return token.tokens ? inlineText(token.tokens) : tokenPlainText(token);
}

function tokenPlainText(token: Token): string {
  return 'text' in token ? token.text : '';
}
