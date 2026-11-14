import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { kitBoardSource, transition } from '../mocks/kit-board-source';
import { startKit } from '../mocks/kit-page-helpers';
import type { OpenPage } from './open-page';

const board = 'Issue board';

const fixLogin = 'Fix login';

const writeDocs = 'Write docs';

async function openBoard(): Promise<OpenPage> {
  const kit = await startKit(kitBoardSource, [], { operations: [transition] });

  return kit.pages.open({ path: '/board' });
}

const textOf = (value: WireJson | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const cardIn = (column: WireNode, title: string): WireNode | undefined =>
  column.children.find((card) => card.props.title === title);

// Where a written column shows its card: in the column the card's `column` names, else in itself.
const shownIn = (written: WireNode, title: string): string | undefined =>
  textOf(cardIn(written, title)?.props.column) ?? textOf(written.props.id);

// The column a card shows in.
function columnOf(page: OpenPage, title: string): string | undefined {
  const written = page
    .find(board)
    .children.find((column) => cardIn(column, title));

  return written && shownIn(written, title);
}

it('moves a card to another column through the Operation the move fills in', async () => {
  const page = await openBoard();

  expect(page.find(fixLogin).type).toBe('Board.Card');
  expect(columnOf(page, fixLogin)).toBe('todo');

  await page.act(board, 'onMove', { id: 'login', column: 'doing' });

  expect(columnOf(page, fixLogin)).toBe('doing');
  expect(page.find(fixLogin).props.pending).toBeUndefined();
  expect(columnOf(page, writeDocs)).toBe('todo');
});

it('refuses a drop on a column the card does not name', async () => {
  const page = await openBoard();

  await expect(
    page.act(board, 'onMove', { id: 'login', column: 'done' }),
  ).rejects.toThrow("Fix login can't move to Done");
  expect(columnOf(page, fixLogin)).toBe('todo');
});

it('puts the card back when its Operation fails', async () => {
  const page = await openBoard();

  await expect(
    page.act(board, 'onMove', { id: 'docs', column: 'done' }),
  ).rejects.toThrow('Write docs has no reviewer');
  expect(columnOf(page, writeDocs)).toBe('todo');
  expect(page.find(writeDocs).props).not.toHaveProperty('pending');
});
