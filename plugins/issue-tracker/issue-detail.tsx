import { Action, Detail, Metadata, Pill, Screen } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import type { PageProps } from './use-issues';

type IssueDetailProps = PageProps & { issue: Issue };

const closed = 'closed';

export function IssueDetail(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Screen
      title={issue.title}
      caption={`#${issue.number}`}
      primaryAction={<StartSessionAction {...props} />}
      actions={<IssueActions {...props} />}
    >
      <Detail
        markdown={issue.body || 'No description.'}
        metadata={<IssueMetadata issue={issue} />}
      />
    </Screen>
  );
}

type IssueActionsProps = Pick<
  IssueDetailProps,
  'issue' | 'onBack' | 'onStatus'
>;

function IssueActions({
  issue,
  onBack,
  onStatus,
}: IssueActionsProps): JSX.Element[] {
  return [
    <BackAction key="back" onBack={onBack} />,
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
}: StartSessionProps): JSX.Element | null {
  if (projectId === null) return null;

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
  if (issue.status === closed)
    return (
      <Action
        label="Reopen Issue"
        icon="issue-open"
        onPress={() => onStatus('open')}
      />
    );

  return (
    <Action label="Close Issue" icon="check" onPress={() => onStatus(closed)} />
  );
}

function BackAction({ onBack }: { onBack: () => void }): JSX.Element {
  return <Action label="Back to Issues" icon="arrow-left" onPress={onBack} />;
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
        text={issue.status === closed ? 'Closed' : 'Open'}
        tone={issue.status === closed ? 'done' : 'success'}
      />
      <IssueLabels labels={issue.labels} />
      <Assignees assignees={issue.assignees} />
      <Metadata.Link title="GitHub" text={issue.url} href={issue.url} />
    </Metadata>
  );
}

function IssueLabels({ labels }: { labels: string[] }): JSX.Element {
  return (
    <Metadata.Pills title="Labels">
      {labels.length === 0 ? (
        <Pill text="None" tone="muted" />
      ) : (
        labels.map((label) => <Pill key={label} text={label} />)
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
