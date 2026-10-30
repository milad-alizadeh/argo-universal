import {
  Action,
  Detail,
  EmptyState,
  Metadata,
  Pill,
  Screen,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueLabel, IssueStatus } from './github-issues';
import { labelPills } from './label-pills';
import {
  useIssueDetail,
  type DetailSource,
  type IssueDetailState,
} from './use-issue-detail';

type IssueDetailProps = Pick<IssueDetailState, 'onStatus'> & {
  issue: Issue;
  projectId: string;
};

type StatusView = {
  text: string;
  tone: string;
  change: { label: string; icon: string; to: IssueStatus };
};

// How each status reads, and the press that moves the Issue to the other one.
const statuses = {
  open: {
    text: 'Open',
    tone: 'success',
    change: { label: 'Close Issue', icon: 'check', to: 'closed' },
  },
  closed: {
    text: 'Closed',
    tone: 'done',
    change: { label: 'Reopen Issue', icon: 'issue', to: 'open' },
  },
} as const satisfies Record<IssueStatus, StatusView>;

// One Issue's own page: its description, status and labels, and the presses that act on it.
export function IssueDetailPage(source: DetailSource): JSX.Element {
  const { issue, message, onStatus } = useIssueDetail(source);
  const projectId = source.project.id;

  if (!issue)
    return (
      <Screen title={`#${source.number}`}>
        <EmptyState title={message} />
      </Screen>
    );

  return (
    <IssueDetail issue={issue} projectId={projectId} onStatus={onStatus} />
  );
}

function IssueDetail(props: IssueDetailProps): JSX.Element {
  return (
    <Screen
      title={props.issue.title}
      caption={`#${props.issue.number}`}
      primaryAction={<StartSessionAction {...props} />}
      actions={<IssueActions {...props} />}
    >
      <Detail
        markdown={props.issue.body || 'No description.'}
        metadata={<IssueMetadata issue={props.issue} />}
      />
    </Screen>
  );
}

type IssueActionsProps = Pick<IssueDetailProps, 'issue' | 'onStatus'>;

function IssueActions({ issue, onStatus }: IssueActionsProps): JSX.Element[] {
  return [
    <StatusAction key="status" issue={issue} onStatus={onStatus} />,
    <OpenAction key="open" url={issue.url} />,
  ];
}

// The Issue's reference, title and link, as the prompt that starts work on it.
const issueDraft = (issue: Issue): string =>
  `#${issue.number} ${issue.title}\n${issue.url}`;

type StartSessionProps = Pick<IssueDetailProps, 'issue' | 'projectId'>;

function StartSessionAction({
  issue,
  projectId,
}: StartSessionProps): JSX.Element {
  return (
    <Action
      label="Start Session"
      icon="new-session"
      onPress={{ action: 'newSession', projectId, draft: issueDraft(issue) }}
    />
  );
}

type StatusActionProps = Pick<IssueDetailProps, 'issue' | 'onStatus'>;

function StatusAction({ issue, onStatus }: StatusActionProps): JSX.Element {
  const { label, icon, to } = statuses[issue.status].change;

  return <Action label={label} icon={icon} onPress={() => onStatus(to)} />;
}

function OpenAction({ url }: { url: string }): JSX.Element {
  return (
    <Action
      label="Open in GitHub"
      icon="external-link"
      onPress={{ action: 'openUrl', url }}
    />
  );
}

function IssueMetadata({ issue }: { issue: Issue }): JSX.Element {
  return (
    <Metadata>
      <Metadata.StatusDot
        title="Status"
        text={statuses[issue.status].text}
        tone={statuses[issue.status].tone}
      />
      <IssueLabels labels={issue.labels} />
      <Assignees assignees={issue.assignees} />
      <Metadata.Link title="GitHub" text={issue.url} href={issue.url} />
    </Metadata>
  );
}

function IssueLabels({ labels }: { labels: IssueLabel[] }): JSX.Element {
  return (
    <Metadata.Pills title="Labels">
      {labels.length === 0 ? (
        <Pill text="None" tone="muted" />
      ) : (
        labelPills(labels)
      )}
    </Metadata.Pills>
  );
}

function Assignees({ assignees }: { assignees: string[] }): JSX.Element {
  if (assignees.length === 0)
    return <Metadata.Label title="Assignees" text="None" />;

  return (
    <>
      {assignees.map((name) => (
        <Metadata.Avatar key={name} title="Assignee" name={name} />
      ))}
    </>
  );
}
