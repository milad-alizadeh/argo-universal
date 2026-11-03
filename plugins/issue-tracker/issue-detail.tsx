import { Action, Button, Callout, Detail, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { IssueMetadata } from './issue-metadata';
import { AttachedSessions, SubIssues } from './issue-sections';
import { statuses } from './issue-status-view';
import {
  useIssueDetail,
  type DetailSource,
  type IssueDetailState,
} from './use-issue-detail';

type IssueDetailProps = Pick<
  IssueDetailState,
  'onStatus' | 'sessions' | 'settled' | 'message' | 'refresh'
> & {
  issue: Issue;
  projectId: string;
  // The page path of another Issue in the same Project, for a relation's row.
  issuePath: (number: number) => string;
};

// One Issue's own page: its description, status and labels, and the presses that act on it.
export function IssueDetailPage(source: DetailSource): JSX.Element {
  const { issue, ...state } = useIssueDetail(source);

  if (!issue) return <Unread source={source} {...state} />;

  return <IssueDetail {...state} {...pageProps(source)} issue={issue} />;
}

// What the page reads from the Project it is in: the Issue's Project, and its siblings' paths.
const pageProps = (
  source: DetailSource,
): Pick<IssueDetailProps, 'projectId' | 'issuePath'> => ({
  projectId: source.project.id,
  issuePath: (number) =>
    source.deps.pages.issuePagePath(source.project, number),
});

type UnreadProps = Pick<IssueDetailState, 'message' | 'refresh'> & {
  source: DetailSource;
};

// An Issue opened without a row to start from has only its number until GitHub answers, and says why when it cannot.
function Unread(props: UnreadProps): JSX.Element {
  return (
    <Screen title={`#${props.source.number}`}>
      <Detail isLoading={!props.message}>
        <ReadFailed {...props} />
      </Detail>
    </Screen>
  );
}

// GitHub could not answer: the page says why, and the reader can ask again.
function ReadFailed({
  message,
  refresh,
}: Pick<IssueDetailState, 'message' | 'refresh'>): JSX.Element | null {
  if (!message) return null;

  const retry = <Button label="Try again" onPress={() => void refresh()} />;

  return (
    <Callout
      tone="danger"
      title="Couldn’t load this Issue"
      description={message}
      actions={retry}
    />
  );
}

function IssueDetail(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Screen
      title={issue.title}
      primaryAction={<StartSessionAction {...props} />}
      actions={<IssueActions {...props} />}
      aside={<IssueMetadata issue={issue} issuePath={props.issuePath} />}
    >
      <IssueBody {...props} />
    </Screen>
  );
}

// The status change, then the one link out to GitHub, as header icons.
function IssueActions(props: IssueDetailProps): JSX.Element {
  return (
    <>
      <StatusAction {...props} />
      <GitHubAction issue={props.issue} />
    </>
  );
}

// The description, then the work under it; the Issue's own properties are the Screen's aside.
function IssueBody(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Detail markdown={bodyOf(props)}>
      {props.settled ? null : <ReadFailed {...props} />}
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

// The Issue on GitHub, a header Action of the page beside the verbs that act on it.
function GitHubAction({ issue }: { issue: Issue }): JSX.Element {
  return (
    <Action
      key="github"
      label="Open on GitHub"
      icon="external-link"
      onPress={{ action: 'openUrl', url: issue.url }}
    />
  );
}

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
