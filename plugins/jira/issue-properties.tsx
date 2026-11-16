import { Metadata, Pill } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import { fieldKeys } from './issue-keys';
import { categoryTones } from './issue-rows';
import { unassigned, type Shown } from './issue-shown';

// The issue's own properties, beside its description: its status, who has it, how urgent it is, and its labels.
const personIcon = { sf: 'person', material: 'person' } as const;

const priorityIcon = { sf: 'flag', material: 'flag' } as const;

const labelPills = (labels: string[]): JSX.Element | JSX.Element[] =>
  labels.length === 0 ? (
    <Pill text="None" tone="muted" />
  ) : (
    labels.map((label) => <Pill key={label} text={label} />)
  );

const status = ({ issue }: Shown): JSX.Element => (
  <Metadata.StatusDot
    key={fieldKeys.status}
    title="Status"
    text={issue.status.name}
    tone={categoryTones[issue.status.category]}
  />
);

const assignee = ({ issue }: Shown): JSX.Element => (
  <Metadata.Label
    key={fieldKeys.assignee}
    title="Assignee"
    icon={personIcon}
    text={issue.assignee?.name ?? unassigned}
  />
);

const priority = ({ issue }: Shown): JSX.Element => (
  <Metadata.Label
    key={fieldKeys.priority}
    title="Priority"
    icon={priorityIcon}
    text={issue.priority ?? 'None'}
  />
);

const jiraLink = ({ site, issue }: Shown): JSX.Element => (
  <Metadata.Link
    title="Jira"
    text={issue.key}
    href={issueUrl(site.host, issue.key)}
  />
);

// Each edit repaints its property by key; the issue's key is its link to Jira.
export const properties = (shown: Shown): JSX.Element => (
  <Metadata>
    {status(shown)}
    {assignee(shown)}
    {priority(shown)}
    <Metadata.Pills title="Labels">
      {labelPills(shown.issue.labels)}
    </Metadata.Pills>
    {jiraLink(shown)}
  </Metadata>
);
