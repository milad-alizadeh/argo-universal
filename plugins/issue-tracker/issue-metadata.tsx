import { Metadata, Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueLabel, IssueRelation } from './github-issues';
import { statuses } from './issue-status-view';
import { labelPills } from './label-pills';

// The Issue's own properties, beside its description: what it is, not the work under it.
export function IssueMetadata({ issue }: { issue: Issue }): JSX.Element {
  return (
    <Metadata>
      <Metadata.StatusDot
        title="Status"
        text={statuses[issue.status].text}
        tone={statuses[issue.status].tone}
      />
      <IssueLabels labels={issue.labels} />
      <Blockers issue={issue} />
      <Assignees assignees={issue.assignees} />
      <GitHubLink url={issue.url} />
    </Metadata>
  );
}

// The Issue's own link, which the header's number carries while there is room for it.
function GitHubLink({ url }: { url: string }): JSX.Element {
  return <Metadata.Link title="GitHub" text={url} href={url} whenNarrow />;
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

// Only the blockers still open hold this Issue up, so the sidebar names those.
function Blockers({ issue }: { issue: Issue }): JSX.Element | null {
  const open = (issue.blockedBy ?? []).filter(
    (blocker) => blocker.status === 'open',
  );

  if (open.length === 0) return null;

  return (
    <>
      {open.map((blocker) => (
        <BlockedBy key={blocker.number} blocker={blocker} />
      ))}
    </>
  );
}

function BlockedBy({ blocker }: { blocker: IssueRelation }): JSX.Element {
  return (
    <Metadata.Label
      title="Blocked by"
      text={`#${blocker.number} ${blocker.title}`}
      icon="refused"
    />
  );
}
