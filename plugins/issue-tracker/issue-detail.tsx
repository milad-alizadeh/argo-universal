import { Action, Detail, EmptyState, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { IssueMetadata } from './issue-metadata';
import { issuePath } from './issue-paths';
import { AttachedSessions, SubIssues } from './issue-sections';
import { statuses } from './issue-status-view';
import {
  useIssueDetail,
  type DetailSource,
  type IssueDetailState,
} from './use-issue-detail';

type IssueDetailProps = Pick<
  IssueDetailState,
  'onStatus' | 'sessions' | 'settled'
> & {
  issue: Issue;
  projectId: string;
  // The page path of another Issue in the same Project, for a relation's row.
  issuePath: (number: number) => string;
};

// One Issue's own page: its description, status and labels, and the presses that act on it.
export function IssueDetailPage(source: DetailSource): JSX.Element {
  const { issue, message, ...state } = useIssueDetail(source);

  if (!issue) return <Loading source={source} message={message} />;

  return <IssueDetail {...state} {...pageProps(source)} issue={issue} />;
}

// What the page reads from the Project it is in: the Issue's Project, and its siblings' paths.
const pageProps = (
  source: DetailSource,
): Pick<IssueDetailProps, 'projectId' | 'issuePath'> => ({
  projectId: source.project.id,
  issuePath: (number) => issuePath(source.project.id, number),
});

// An Issue opened without a row to start from has only its number until GitHub answers, and says why when it cannot.
function Loading(props: {
  source: DetailSource;
  message: string;
}): JSX.Element {
  return (
    <Screen title={`#${props.source.number}`}>
      <EmptyState title={props.message || 'Opening…'} />
    </Screen>
  );
}

function IssueDetail(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Screen
      title={issue.title}
      primaryAction={<StartSessionAction {...props} />}
      actions={<StatusAction {...props} />}
    >
      <IssueBody {...props} />
    </Screen>
  );
}

// The description, the Issue's own properties beside it, and the work under both.
function IssueBody(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Detail markdown={bodyOf(props)} metadata={<IssueMetadata issue={issue} />}>
      <SubIssues issue={issue} issuePath={props.issuePath} />
      <AttachedSessions sessions={props.sessions} />
    </Detail>
  );
}

// A row's Issue has no description yet, so the page leaves it empty until GitHub's own arrives.
const bodyOf = ({ issue, settled }: IssueDetailProps): string =>
  settled ? issue.body || 'No description.' : '';

// The Issue's reference, title and link, as the prompt that starts work on it.
const issueDraft = (issue: Issue): string =>
  `#${issue.number} ${issue.title}\n${issue.url}`;

type StartSessionProps = Pick<IssueDetailProps, 'issue' | 'projectId'>;

/*
 * What the Issue asks of the reader, on its title's line: start work on it, or settle it. They are the Screen's
 * header Actions, inside the pane the Issue is read in, so the page's verbs sit with what they act on.
 */
function StartSessionAction({
  issue,
  projectId,
}: StartSessionProps): JSX.Element {
  return (
    <Action
      key="start-session"
      label="Start Session"
      icon="new-session"
      onPress={{ action: 'newSession', projectId, draft: issueDraft(issue) }}
    />
  );
}

type StatusActionProps = Pick<IssueDetailProps, 'issue' | 'onStatus'>;

function StatusAction({ issue, onStatus }: StatusActionProps): JSX.Element {
  const { label, icon, to } = statuses[issue.status].change;

  return (
    <Action
      key="status"
      label={label}
      icon={icon}
      onPress={() => onStatus(to)}
    />
  );
}
