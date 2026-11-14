import { expect, it } from 'vitest';
import { boardEventCall } from '../board-moves';
import { issueBoardRoot } from '../board-wire-fixtures';
import { kitComponent } from '../kit';
import { optimisticTree } from '../optimistic-tree';
import { kitIndex } from '../plugin-guide-reference';
import { prepareWireTree } from '../prepare-tree';
import { componentEventPayload, PageCall, type WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

const onMove = PageCall.parse(issueBoardRoot.props.onMove);

it('draws a board of columns whose cards name the columns they move to', () => {
  expect(prepareWireTree(issueBoardRoot)).toEqual(issueBoardRoot);
});

it('refuses a card outside a column', () => {
  const loose: WireNode = {
    ...issueBoardRoot,
    children: issueBoardRoot.children[0]?.children ?? [],
  };

  expect(prepareWireTree(loose)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});

it("reports the moved card's id and the column it lands in", () => {
  const schema = kitComponent('Board')?.events.onMove;
  const move = { id: 'login', column: 'doing' };

  expect(componentEventPayload(schema, move)).toEqual(move);
  expect(() => componentEventPayload(schema, { id: 'login' })).toThrow(
    'Invalid Plugin event payload',
  );
});

it('fills the Operation call, and shows the card in its new column, pending, until it answers', () => {
  const call = boardEventCall(issueBoardRoot, onMove, {
    id: 'login',
    column: 'doing',
  });

  expect(call).toEqual({
    operation: 'transition',
    args: { issue: 'login', status: 'doing' },
    optimistic: [{ key: 'login', props: { column: 'doing', pending: true } }],
  });
});

it('refuses a column the card does not name', () => {
  expect(() =>
    boardEventCall(issueBoardRoot, onMove, { id: 'login', column: 'done' }),
  ).toThrow("Fix login can't move to Done");
});

it('refuses a move to the column the card is in', () => {
  expect(() =>
    boardEventCall(issueBoardRoot, onMove, { id: 'search', column: 'doing' }),
  ).toThrow('Add search is already in In progress');
});

it('refuses a card the board does not hold', () => {
  expect(() =>
    boardEventCall(issueBoardRoot, onMove, { id: 'gone', column: 'done' }),
  ).toThrow('The board holds no card gone');
});

it('reads a card shown in another column, as a pending move shows it, from there', () => {
  const call = boardEventCall(issueBoardRoot, onMove, {
    id: 'login',
    column: 'doing',
  });
  const shown =
    call && 'optimistic' in call && call.optimistic
      ? optimisticTree(issueBoardRoot, call.optimistic)
      : issueBoardRoot;

  expect(() =>
    boardEventCall(shown, onMove, { id: 'login', column: 'doing' }),
  ).toThrow('Fix login is already in In progress');
});

it("lists the Board and its parts in the kit's component reference", () => {
  expect(kitIndex()).toMatch(/^- Board: /m);
  expect(kitIndex()).toMatch(/^- Board\.Column: /m);
  expect(kitIndex()).toMatch(/^- Board\.Card: /m);
});
