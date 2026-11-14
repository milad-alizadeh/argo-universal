import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { kitBoardSource, transition } from '../mocks/kit-board-source';
import { startKit } from '../mocks/kit-page-helpers';

const openBoard = async () => {
  const kit = await startKit(kitBoardSource, [], { operations: [transition] });

  return kit.pages.open({ path: '/board' });
};

// The column a card shows in: the one its `column` names, else the one it is written in.
const columnOf = (board: WireNode, title: string): unknown => {
  for (const column of board.children) {
    const card = column.children.find((each) => each.props.title === title);

    if (card) return card.props.column ?? column.props.id;
  }

  return undefined;
};

it('moves a card to another column through the Operation the move fills in', async () => {
  const page = await openBoard();

  expect(page.find('Fix login').type).toBe('Board.Card');
  expect(columnOf(page.find('Issue board'), 'Fix login')).toBe('todo');

  await page.act('Issue board', 'onMove', { id: 'login', column: 'doing' });

  expect(columnOf(page.find('Issue board'), 'Fix login')).toBe('doing');
  expect(page.find('Fix login').props.pending).toBeUndefined();
  expect(columnOf(page.find('Issue board'), 'Write docs')).toBe('todo');
});

it('refuses a drop on a column the card does not name', async () => {
  const page = await openBoard();

  await expect(
    page.act('Issue board', 'onMove', { id: 'login', column: 'done' }),
  ).rejects.toThrow("Fix login can't move to Done");
  expect(columnOf(page.find('Issue board'), 'Fix login')).toBe('todo');
});

it('puts the card back when its Operation fails', async () => {
  const page = await openBoard();

  await expect(
    page.act('Issue board', 'onMove', { id: 'docs', column: 'done' }),
  ).rejects.toThrow('Write docs has no reviewer');
  expect(columnOf(page.find('Issue board'), 'Write docs')).toBe('todo');
  expect(page.find('Write docs').props).not.toHaveProperty('pending');
});
