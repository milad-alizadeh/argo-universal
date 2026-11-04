import {
  Action,
  Detail,
  EmptyState,
  Screen,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueStatus } from './github-issues';
import type { AttachedSession, IssueDetailData } from './issue-detail-data';
import { IssueMetadata, statusDotKey } from './issue-metadata';
import { issuePath } from './issue-paths';
import { AttachedSessions, SubIssues } from './issue-sections';
import { statuses } from './issue-status-view';

type IssueDetailProps = {
  data: IssueDetailData;
  projectId: string;
  number: number;
  to: PageTo;
};

type ShownProps = Omit<IssueDetailProps, 'data'> & {
  issue: Issue;
  sessions: AttachedSession[];
};

// One Issue's own page: its description, status and labels, and the presses that act on it.
export function IssueDetailPage(props: IssueDetailProps): JSX.Element {
  const { data } = props;

  if (!data.found)
    return (
      <Screen title={`#${props.number}`}>
        <EmptyState title={data.message} />
      </Screen>
    );

  return <IssueDetail {...props} issue={data.issue} sessions={data.sessions} />;
}

function IssueDetail(props: ShownProps): JSX.Element {
  return (
    <Screen
      title={props.issue.title}
      primaryAction={<StartSessionAction {...props} />}
      actions={<StatusAction {...props} />}
    >
      <IssueBody {...props} />
    </Screen>
  );
}

// The description, the Issue's own properties beside it, and the work under both.
function IssueBody({ issue, projectId, sessions }: ShownProps): JSX.Element {
  return (
    <Detail
      markdown={issue.body || 'No description.'}
      metadata={<IssueMetadata issue={issue} />}
    >
      <SubIssues
        issue={issue}
        issuePath={(number) => issuePath(projectId, number)}
      />
      <AttachedSessions sessions={sessions} />
    </Detail>
  );
}

// The Issue's reference, title and link, as the prompt that starts work on it.
const issueDraft = (issue: Issue): string =>
  `#${issue.number} ${issue.title}\n${issue.url}`;

/*
 * What the Issue asks of the reader, on its title's line: start work on it, or settle it. They are the Screen's
 * header Actions, inside the pane the Issue is read in, so the page's verbs sit with what they act on.
 */
function StartSessionAction({ issue, projectId }: ShownProps): JSX.Element {
  return (
    <Action
      key="start-session"
      label="Start Session"
      icon="new-session"
      onPress={{ action: 'newSession', projectId, draft: issueDraft(issue) }}
    />
  );
}

// The status Action shares its key with the Issue's filter row's, so one Operation's patch repaints both.
const statusActionKey = (number: number): string => `status-${number}`;

/*
 * Closes or reopens the Issue as the `setStatus` Operation; the status and the Action show the new status at
 * once, and the old one again when gh refuses it.
 */
function StatusAction({ issue, projectId, to }: ShownProps): JSX.Element {
  const { label, icon, to: next } = statuses[issue.status].change;
  const { number } = issue;
  const press = setStatus(to, { number, status: next, projectId });

  return (
    <Action
      key={statusActionKey(number)}
      label={label}
      icon={icon}
      onPress={press}
    />
  );
}

type Patches = NonNullable<ReturnType<PageTo['run']>['optimistic']>;

type StatusChange = { number: number; status: IssueStatus; projectId: string };

const setStatus = (
  to: PageTo,
  change: StatusChange,
): ReturnType<PageTo['run']> =>
  to.run('setStatus', change, {
    optimistic: statusPatches(change.number, change.status),
  });

const statusPatches = (number: number, status: IssueStatus): Patches => [
  {
    key: statusDotKey(number),
    props: { text: statuses[status].text, tone: statuses[status].tone },
  },
  {
    key: statusActionKey(number),
    props: {
      label: statuses[status].change.label,
      icon: statuses[status].change.icon,
    },
  },
];
