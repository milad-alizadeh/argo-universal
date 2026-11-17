import { FieldGroup } from '@argo/plugin-kit';
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
        {openBlockers(props.issue).map((blocker) => (
          <BlockedBy key={blocker.number} blocker={blocker} />
        ))}
        <Assignees {...props} />
        <GitHubLink issue={props.issue} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

// The Issue's number is its link out: a property of the Issue, so it sits with the rest of them.
function GitHubLink({ issue }: { issue: Issue }): JSX.Element {
  return (
    <FieldGroup.Link
      title="GitHub"
      value={`#${issue.number}`}
      onPress={{ action: 'openUrl', url: issue.url }}
    />
  );
}

// Only the blockers still open hold this Issue up, so the sidebar names those.
const openBlockers = (issue: Issue): IssueRelation[] =>
  (issue.blockedBy ?? []).filter((blocker) => blocker.status === 'open');

function BlockedBy({ blocker }: { blocker: IssueRelation }): JSX.Element {
  return (
    <FieldGroup.Value
      title="Blocked by"
      value={`#${blocker.number} ${blocker.title}`}
    />
  );
}
