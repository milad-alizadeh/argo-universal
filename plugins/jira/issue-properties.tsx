import { FieldGroup } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import { fieldKeys } from './issue-keys';
import { categoryTones } from './issue-rows';
import { unassigned, type Shown } from './issue-shown';

// The issue's own properties, beside its description, as the Issue tracker draws its own: Settings' FieldGroup rows.
const status = ({ issue }: Shown): JSX.Element => (
  <FieldGroup.Value
    key={fieldKeys.status}
    title="Status"
    value={issue.status.name}
    dot={categoryTones[issue.status.category]}
  />
);

const assignee = ({ issue }: Shown): JSX.Element => (
  <FieldGroup.Value
    key={fieldKeys.assignee}
    title="Assignee"
    value={issue.assignee?.name ?? unassigned}
  />
);

const priority = ({ issue }: Shown): JSX.Element => (
  <FieldGroup.Value
    key={fieldKeys.priority}
    title="Priority"
    value={issue.priority ?? 'None'}
  />
);

const labels = ({ issue }: Shown): JSX.Element => (
  <FieldGroup.Value
    title="Labels"
    value={issue.labels.length === 0 ? 'None' : issue.labels.join(', ')}
  />
);

// The issue's key is its link out to Jira: a property of the issue, so it sits with the rest of them.
const jiraLink = ({ site, issue }: Shown): JSX.Element => (
  <FieldGroup.Link
    title="Jira"
    value={issue.key}
    onPress={{ action: 'openUrl', url: issueUrl(site.host, issue.key) }}
  />
);

// Each edit repaints its property by key.
export const properties = (shown: Shown): JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section>
      {status(shown)}
      {assignee(shown)}
      {priority(shown)}
      {labels(shown)}
      {jiraLink(shown)}
    </FieldGroup.Section>
  </FieldGroup>
);
