// The board's move, declared as the manifest declares it: the issue and the status it moves to.
export const transition = {
  name: 'transition',
  label: 'Transition an issue',
  description: 'Moves an issue to another status.',
  tier: 'act' as const,
  params: {
    issue: {
      type: 'string' as const,
      description: 'The issue',
      required: true,
    },
    status: {
      type: 'string' as const,
      description: 'The status it moves to',
      required: true,
    },
  },
};

/*
 * A board drawn through the kit the way a real Plugin draws one: the worker keeps each issue's status, each card
 * names the statuses it may move to, and a move runs `transition` with the card and column the Board reports. The
 * tracker refuses to close Write docs, so that move fails.
 */
export const kitBoardSource = `import { Board, Pill, Screen } from '@argo/plugin-kit';

const columns = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

const issues = [
  { id: 'login', title: 'Fix login', status: 'todo', movesTo: ['doing'] },
  { id: 'docs', title: 'Write docs', status: 'todo', movesTo: ['doing', 'done'] },
];

const board = (to) => (
  <Screen title="Issues" width="bleed">
    <Board accessibilityLabel="Issue board" onMove={to.run('transition', { issue: to.payload('id'), status: to.payload('column') })}>
      {columns.map((column) => (
        <Board.Column key={column.id} id={column.id} title={column.title}>
          {issues.filter((issue) => issue.status === column.id).map((issue) => (
            <Board.Card key={issue.id} id={issue.id} title={issue.title} subtitle={issue.id.toUpperCase()} movesTo={issue.movesTo} meta={<Pill text="Bug" />} />
          ))}
        </Board.Column>
      ))}
    </Board>
  </Screen>
);

export function register(argo) {
  argo.operations.register('transition', ({ issue, status }) => {
    if (issue === 'docs' && status === 'done') throw new Error('The tracker refused: Write docs has no reviewer');
    const moved = issues.find((each) => each.id === issue);
    moved.status = status;
  });
  argo.pages.define('/board', { load: () => null, render: (_data, to) => board(to) });
}`;
