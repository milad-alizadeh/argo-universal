import { expect, it } from 'vitest';
import { columnWidths } from './table-widths';

const grows = (rows: string[][]): number[] =>
  columnWidths(rows).map((width) => width.grow);

it('gives the column holding the longest text the larger share', () => {
  const [number = 0, prose = 0] = grows([
    ['#', 'Current state'],
    ['1396', 'A long sentence about what is left to do here.'],
  ]);

  expect(prose).toBeGreaterThan(number);
});

it('keeps equal columns equal', () => {
  const [left, right] = grows([
    ['Column one', 'Column two'],
    ['A value here', 'A value here'],
  ]);

  expect(left).toBe(right);
});

it('counts a heading when it is longer than every cell', () => {
  const [heading = 0, cell = 0] = grows([
    ['Current state / next action', 'x'],
    ['ok', 'y'],
  ]);

  expect(heading).toBeGreaterThan(cell);
});

it('stops a column of prose from widening without end', () => {
  const short = 'word '.repeat(20);
  const long = 'word '.repeat(200);

  expect(grows([[short, long]])).toEqual(grows([[long, long]]));
});

it('keeps a minimum width for a column with nothing in it', () => {
  const [empty] = columnWidths([['', 'Value']]);

  expect(empty?.minWidth).toBeGreaterThan(0);
});

it('reads a row with missing cells as empty there', () => {
  expect(grows([['One', 'Two'], ['Three']])).toHaveLength(2);
});

it('has no columns when the table has no rows', () => {
  expect(columnWidths([])).toEqual([]);
});
