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
      actions={<IssueActions issue={issue} onBack={props.onBack} />}
    >
      <Detail
        markdown={issue.body || 'No description.'}
        metadata={<IssueMetadata issue={issue} />}
      />
    </Screen>
  );
}

type IssueActionsProps = Pick<IssueDetailProps, 'issue' | 'onBack'>;

function IssueActions({ issue, onBack }: IssueActionsProps): JSX.Element[] {
  return [
    <BackAction key="back" onBack={onBack} />,
    <OpenAction key="open" url={issue.url} />,
  ];
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
