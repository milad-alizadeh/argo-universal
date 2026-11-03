import { Metadata, Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueLabel, IssueRelation } from './github-issues';
import { statuses } from './issue-status-view';
import { labelPills } from './label-pills';

type IssuePath = (number: number) => string;

type MetadataProps = { issue: Issue; issuePath: IssuePath };

/*
 * The Issue's own properties, the Screen's aside: what it is, not the work under it. Status and assignees lead with
 * their glyphs; labels, blockers and the sub-Issue tally follow under their names.
 */
export function IssueMetadata({
  issue,
  issuePath,
}: MetadataProps): JSX.Element {
  return (
    <Metadata>
      <IssueStatus issue={issue} />
      <Assignees assignees={issue.assignees} />
      <IssueLabels labels={issue.labels} />
      <Blockers issue={issue} issuePath={issuePath} />
      <SubIssueTally issue={issue} />
    </Metadata>
  );
}

// How many sub-Issues are closed, as GitHub counts them; the rows themselves are under the description.
function SubIssueTally({ issue }: { issue: Issue }): JSX.Element | null {
  const { progress } = issue;

  if (!progress || progress.total === 0) return null;

  return (
    <Metadata.Label
      title="Sub-Issues"
      text={`${progress.completed} of ${progress.total} closed`}
      icon="checklist"
    />
  );
}

function IssueLabels({ labels }: { labels: IssueLabel[] }): JSX.Element {
  return (
    <Metadata.Pills title="Labels" icon="tag">
      {labels.length === 0 ? (
        <Pill text="None" tone="muted" />
      ) : (
        labelPills(labels)
      )}
    </Metadata.Pills>
  );
}

function IssueStatus({ issue }: { issue: Issue }): JSX.Element {
  const { text, tone } = statuses[issue.status];

  return <Metadata.StatusDot title="Status" text={text} tone={tone} />;
}

function Assignees({ assignees }: { assignees: string[] }): JSX.Element {
  if (assignees.length === 0)
    return <Metadata.Label title="Assignee" text="No assignee" />;

  return (
    <>
      {assignees.map((name) => (
        <Metadata.Avatar key={name} title="Assignee" name={name} />
      ))}
    </>
  );
}

// Only the blockers still open hold this Issue up, so the aside names those, each opening its own page.
const openBlockers = ({ blockedBy }: Issue): IssueRelation[] =>
  (blockedBy ?? []).filter((blocker) => blocker.status === 'open');

function Blockers({ issue, issuePath }: MetadataProps): JSX.Element | null {
  const open = openBlockers(issue);

  if (open.length === 0) return null;

  return (
    <>
      {open.map((blocker) => (
        <BlockedBy
          key={blocker.number}
          blocker={blocker}
          href={issuePath(blocker.number)}
        />
      ))}
    </>
  );
}

function BlockedBy(props: {
  blocker: IssueRelation;
  href: string;
}): JSX.Element {
  const { blocker } = props;

  return (
    <Metadata.Link
      title="Blocked by"
      text={`#${blocker.number} ${blocker.title}`}
      href={props.href}
    />
  );
}
