import type { WireNode } from './wire';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({
  type,
  key,
  props,
  children: [],
  slots: {},
});

// A card that opens on press and names the columns it may move to.
const card = (id: string, title: string, movesTo: string[]): WireNode =>
  node('Board.Card', id, {
    id,
    title,
    subtitle: id.toUpperCase(),
    movesTo,
    onPress: { pageState: { card: id } },
  });

const column = (id: string, title: string, cards: WireNode[]): WireNode => ({
  ...node('Board.Column', id, { id, title }),
  children: cards,
});

// A board of three columns; each card names the columns it may move to, and a move runs `transition`.
export const issueBoardRoot: WireNode = {
  ...node('Board', 'board', {
    accessibilityLabel: 'Issues',
    onMove: {
      operation: 'transition',
      args: { issue: { $payload: 'id' }, status: { $payload: 'column' } },
    },
  }),
  children: [
    column('todo', 'To do', [
      card('login', 'Fix login', ['doing']),
      card('docs', 'Write docs', ['doing', 'done']),
    ]),
    column('doing', 'In progress', [
      card('search', 'Add search', ['todo', 'done']),
    ]),
    column('done', 'Done', []),
  ],
};

// The same columns with no cards in any of them.
export const emptyBoardRoot: WireNode = {
  ...issueBoardRoot,
  key: 'empty-board',
  children: issueBoardRoot.children.map((each) => ({ ...each, children: [] })),
};
