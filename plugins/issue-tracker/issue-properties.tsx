import { FieldGroup, Label, Link } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueRelation } from './github-issues';
import { Assignees } from './issue-assignee-picker';
import { IssueLabels, IssueStatus, type Editable } from './issue-pickers';

// The Issue's own properties, beside its description: what it is, not the work under it.
export function IssueProperties(props: Editable): JSX.Element {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        <IssueStatus {...props} />
        <IssueLabels {...props} />
        <Blockers issue={props.issue} />
        <Assignees {...props} />
        <GitHubLink issue={props.issue} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

// The Issue's number is its link out: a property of the Issue, so it sits with the rest of them.
function GitHubLink({ issue }: { issue: Issue }): JSX.Element {
  return (
    <FieldGroup.Value title="GitHub">
      <Link label={`#${issue.number}`} href={issue.url} />
    </FieldGroup.Value>
  );
}

// Only the blockers still open hold this Issue up, so the sidebar names those.
function Blockers({ issue }: { issue: Issue }): JSX.Element | null {
  const open = (issue.blockedBy ?? []).filter(
    (blocker) => blocker.status === 'open',
  );

  if (open.length === 0) return null;

  return (
    <FieldGroup.Value title="Blocked by">
      {open.map((blocker) => (
        <BlockedBy key={blocker.number} blocker={blocker} />
      ))}
    </FieldGroup.Value>
  );
}

function BlockedBy({ blocker }: { blocker: IssueRelation }): JSX.Element {
  return <Label text={`#${blocker.number} ${blocker.title}`} icon="refused" />;
}
