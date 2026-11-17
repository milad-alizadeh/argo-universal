import { Board, Label, SegmentedControl } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { boardColumns, boardLabel, movesOf } from './board-columns';
import type { JiraStatus } from './issue-fields';
import { isFailure } from './issue-pages';
import { issuePath } from './jira-paths';
import type { JiraIssue, JiraPerson } from './jira-readers';
import type { IssuesTo, Listing } from './view-frame';

// How a Project's issues show: a list or a board. It is Page state, so the App keeps it for the page.
export type IssuesView = 'list' | 'board';

const issuesViews = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
] as const satisfies readonly { value: IssuesView; label: string }[];

// The list/board switch above the issues.
export const viewSwitch = (view: IssuesView, to: IssuesTo): JSX.Element => (
  <SegmentedControl
    key="view"
    label="Show issues as"
    options={issuesViews}
    value={view}
    onValueChange={to.bind('view')}
  />
);

const personIcon = { sf: 'person', material: 'person' } as const;

const priorityIcon = { sf: 'flag', material: 'flag' } as const;

const priorityLabel = (priority: string | null): JSX.Element[] =>
  priority
    ? [<Label key="priority" icon={priorityIcon} text={priority} />]
    : [];

const assigneeLabel = (assignee: JiraPerson | null): JSX.Element =>
  assignee ? (
    <Label key="assignee" icon={personIcon} text={assignee.name} />
  ) : (
    <Label key="assignee" icon={personIcon} text="Unassigned" tone="muted" />
  );

// What a card says under its key: its priority and who it is assigned to; its column says its status.
const cardMeta = ({ priority, assignee }: JiraIssue): JSX.Element[] => [
  ...priorityLabel(priority),
  assigneeLabel(assignee),
];

type Cards = { projectId: string; to: IssuesTo };

const issueCard = ({ projectId, to }: Cards, issue: JiraIssue): JSX.Element => (
  <Board.Card
    key={issue.key}
    id={issue.key}
    title={issue.summary || issue.key}
    subtitle={issue.key}
    meta={cardMeta(issue)}
    movesTo={movesOf(issue)}
    onPress={to.go(issuePath(projectId, issue.key))}
  />
);

const statusColumn = (
  cards: Cards,
  status: JiraStatus,
  issues: JiraIssue[],
): JSX.Element => (
  <Board.Column key={status.id} id={status.id} title={status.name}>
    {issues.flatMap((issue) =>
      issue.status.id === status.id ? [issueCard(cards, issue)] : [],
    )}
  </Board.Column>
);

// A move runs `transition` with the card's issue and the column's status id, which the Operation takes as a status.
const moveOf = ({ projectId, to }: Cards): ReturnType<IssuesTo['run']> =>
  to.run('transition', {
    issue: to.payload('id'),
    status: to.payload('column'),
    projectId,
  });

/*
 * The project's issues as a board: a column for each status and a card for each issue in its status. The App shows a
 * move at once and puts the card back if Jira refuses it; a phone moves a card from its menu, which offers the same
 * columns as a drag.
 */
const issueBoard = (
  cards: Cards,
  issues: JiraIssue[],
  statuses: JiraStatus[],
): JSX.Element => (
  <Board key="board" accessibilityLabel={boardLabel} onMove={moveOf(cards)}>
    {boardColumns(statuses, issues).map((status) =>
      statusColumn(cards, status, issues),
    )}
  </Board>
);

export const viewOf = ({ view }: Pick<Listing, 'view'>): IssuesView =>
  view === 'board' ? 'board' : 'list';

const issuesIn = ({ list }: Listing): JiraIssue[] =>
  list.items.flatMap((item) => (isFailure(item) ? [] : [item]));

/*
 * The issues the filters leave as a board, when the switch asks for one, whose columns are the project's statuses even
 * before it has an issue; null for the list, or when there is neither an issue nor a status to draw.
 */
export function boardOf(
  { projectId }: { projectId: string },
  listing: Listing,
): JSX.Element | null {
  const issues = issuesIn(listing);
  const empty = issues.length + listing.statuses.length === 0;

  if (viewOf(listing) !== 'board' || empty) return null;

  return issueBoard({ projectId, to: listing.to }, issues, listing.statuses);
}
