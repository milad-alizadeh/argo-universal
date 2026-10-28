import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement, ReactNode } from 'react';
import { Text } from 'react-native';
import { expect } from 'storybook/test';
import { ListItem } from '../list-item';
import { List } from './list';
import type { ListChild } from './list-children';
import {
  listTree,
  readList,
  type ListBlock,
  type ListReading,
  type ShownOrder,
} from './list-section-model';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Reading',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const reader = (children: ReactNode): Parameters<typeof readList>[1] => ({
  prefix: 'list',
  tree: listTree(
    children,
    { folded: new Set(), toggle: () => {}, drawn: false },
    true,
  ),
});

const row = (id: string): ReactElement => (
  <ListItem key={id} id={id} title={id} />
);

// Loose rows before and after two Sections, so the rows outside any Section are read as one.
const board = [
  row('note'),
  <List.Section key="todo" id="todo" title="To do">
    {row('login')}
    {row('docs')}
  </List.Section>,
  <List.Section key="done" id="done" title="Done">
    {row('search')}
  </List.Section>,
  row('later'),
];

const entriesOf = (block: ListBlock): ListChild[] =>
  block.kind === 'items' ? block.items : block.blocks.flatMap(entriesOf);

// Each block's movable rows, in the order the List draws them.
const rowsPerBlock = ({ blocks }: ListReading): string[][] =>
  blocks.map((block) =>
    entriesOf(block).flatMap((entry) => entry.moveId ?? []),
  );

const keysOf = ({ blocks }: ListReading): string[] =>
  blocks.flatMap(entriesOf).map((entry) => entry.key);

const owners: ShownOrder = (sections) => sections;

const moved =
  (move: ListMove): ShownOrder =>
  (sections) =>
    applyListMove(sections, move);

// Draws what the play reads, so each story draws its own reading.
function reading(
  children: ReactNode[],
  shown: ShownOrder | undefined,
  play: (read: ListReading) => void,
): Story {
  const read = (): ListReading => readList(children, reader(children), shown);

  return {
    render: () => <Text>{JSON.stringify(rowsPerBlock(read()))}</Text>,
    play: () => play(read()),
  };
}

export const ReadsRowsPerSectionInTheOwnersOrder = reading(
  board,
  owners,
  (read) => {
    expect(rowsPerBlock(read)).toEqual([
      ['note'],
      ['login', 'docs'],
      ['search'],
      ['later'],
    ]);

    expect(read.sections.map((section) => section.rows)).toEqual([
      ['note', 'later'],
      ['login', 'docs'],
      ['search'],
    ]);
  },
);

export const ReadsAHeldMoveIntoTheShownOrder = reading(
  board,
  moved({ id: 'login', section: 'done', index: 1 }),
  (read) => {
    expect(rowsPerBlock(read)).toEqual([
      ['note'],
      ['docs'],
      ['search', 'login'],
      ['later'],
    ]);

    expect(read.sections[1]?.rows).toEqual(['login', 'docs']);
  },
);

export const MovesALooseRowIntoASection = reading(
  board,
  moved({ id: 'later', section: 'todo', index: 0 }),
  (read) => {
    expect(rowsPerBlock(read)).toEqual([
      ['note'],
      ['later', 'login', 'docs'],
      ['search'],
    ]);
  },
);

export const KeysRowsByPlaceWithoutMoves = reading(board, undefined, (read) => {
  expect(read.sections).toEqual([]);
  expect(keysOf(read).some((key) => key.includes('/row/'))).toBe(false);
});

export const KeepsAPlaceKeyForARepeatedId = reading(
  [row('twin'), row('twin'), row('solo')],
  owners,
  (read) => {
    const keys = keysOf(read);

    expect(new Set(keys).size).toBe(keys.length);
  },
);
