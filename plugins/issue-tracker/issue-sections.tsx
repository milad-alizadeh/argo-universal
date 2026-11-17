import { List, ListItem, SessionRow } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueProgress, IssueRelation } from './github-issues';
import type { AttachedSession } from './issue-detail-data';
import { statusMark } from './issue-status-mark';

// The page path of another Issue in the same Project, for a sub-Issue's row.
type IssuePath = (number: number) => string;

export type SubIssuesProps = { issue: Issue; issuePath: IssuePath };

export type SessionsProps = { sessions: AttachedSession[] };

type RowProps = { child: IssueRelation; path: IssuePath };

/*
 * The Issue's sub-Issues, closed ones included, under the description: a child is work on this page,
 * not a property of it, and each row reads as it does on the list screen and opens that Issue's page.
 */
export function SubIssues(props: SubIssuesProps): JSX.Element | null {
  const children = props.issue.children ?? [];

  if (children.length === 0) return null;

  return (
    <List appearance="plain" density="compact">
      <List.Section
        key="sub-issues"
        title="Sub-Issues"
        subtitle={tally(props.issue)}
      >
        {children.map((child) => subIssueRow(child, props.issuePath))}
      </List.Section>
    </List>
  );
}

// A keyed ListItem itself, as a List draws its children, not a component that returns one.
const subIssueRow = (child: IssueRelation, path: IssuePath): JSX.Element => (
  <SubIssueRow key={child.number} child={child} path={path} />
);

// The sub-Issue tally GitHub keeps, read as the section's own line.
const tally = ({ progress }: Issue): string | undefined =>
  progress && progressText(progress);

const progressText = ({ completed, total }: IssueProgress): string =>
  `${completed} of ${total} closed`;

function SubIssueRow(props: RowProps): JSX.Element {
  const { child } = props;

  return (
    <ListItem
      id={String(child.number)}
      leading={statusMark(child)}
      title={child.title}
      subtitle={`#${child.number}`}
      finished={child.status !== 'open'}
      onPress={{ action: 'navigate', path: props.path(child.number) }}
    />
  );
}

/*
 * The Sessions an Agent attached with `argo run issue-tracker.attach`: the work on this Issue, each as Argo's own Session
 * row, read live, so it never goes stale and opens that Session.
 */
export function AttachedSessions(props: SessionsProps): JSX.Element | null {
  if (props.sessions.length === 0) return null;

  return (
    <List appearance="grouped">
      <List.Section key="sessions" title="Sessions">
        {props.sessions.map((session) => (
          <SessionRow key={session.sessionId} sessionId={session.sessionId} />
        ))}
      </List.Section>
    </List>
  );
}
