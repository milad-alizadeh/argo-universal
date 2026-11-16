import {
  FieldGroup,
  Label,
  Pill,
  StatusDot,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, IssueLabel } from './github-issues';
import type { ChoicesRead } from './issue-detail-data';
import { statuses } from './issue-status-view';
import { labelPills } from './label-pills';

// The Issue's status dot and words name their Issue, so a status change's optimistic patch repaints them.
export const statusDotKey = (number: number): string => `dot-${number}`;

export const statusTextKey = (number: number): string =>
  `status-text-${number}`;

// The picker holding an Issue's status shares its key with the status Action's patch, so one change repaints both.
export const statusPickerKey = (number: number): string => `picker-${number}`;

// What the editable properties need: where to run an edit, and what can be chosen.
export type IssueEditing = ChoicesRead & { projectId: string; to: PageTo };

export type Editable = { issue: Issue; editing: IssueEditing };

export type Run = ReturnType<PageTo['run']>;

export type Choice = {
  value: string;
  label: string;
  color?: string;
  avatar?: boolean;
};

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
] as const;

const statusEdit = (number: number, { to, projectId }: IssueEditing): Run =>
  to.run('setStatus', { number, status: to.payload(), projectId });

export function IssueStatus({ issue, editing }: Editable): JSX.Element {
  const { text, tone } = statuses[issue.status];

  return (
    <FieldGroup.Picker
      key={statusPickerKey(issue.number)}
      title="Status"
      presentation="page"
      value={issue.status}
      options={statusOptions}
      onValueChange={statusEdit(issue.number, editing)}
    >
      <StatusDot key={statusDotKey(issue.number)} tone={tone} />
      <Label key={statusTextKey(issue.number)} text={text} />
    </FieldGroup.Picker>
  );
}

// The options are on their way until the read answers either way.
export type ChoiceState = { loading: boolean; loadError: string | undefined };

export const choiceState = (editing: IssueEditing): ChoiceState => ({
  loading: editing.choices === null && editing.choicesError === '',
  loadError: editing.choicesError || undefined,
});

// The repository's labels, with the Issue's own beside them in case the repository has more than GitHub's first page.
function labelsToChoose(issue: Issue, editing: IssueEditing): IssueLabel[] {
  const all = editing.choices?.labels ?? [];
  const known = new Set(all.map(({ name }) => name));

  return [...all, ...issue.labels.filter(({ name }) => !known.has(name))];
}

const labelOptions = (issue: Issue, editing: IssueEditing): Choice[] =>
  labelsToChoose(issue, editing).map(({ name, color }) => ({
    value: name,
    label: name,
    color,
  }));

type LabelEvents = { onToggle: Run; onCreate: Run };

function labelEvents(
  number: number,
  { to, projectId }: IssueEditing,
): LabelEvents {
  return {
    onToggle: to.run('setLabel', {
      number,
      label: to.payload('value'),
      on: to.payload('on'),
      projectId,
    }),
    onCreate: to.run('createLabel', { number, name: to.payload(), projectId }),
  };
}

// The Issue's labels as Pills, or one muted Pill when it has none.
const labelValues = (labels: IssueLabel[]): JSX.Element | JSX.Element[] =>
  labels.length === 0 ? <Pill text="None" tone="muted" /> : labelPills(labels);

const labelPicker = {
  title: 'Labels',
  presentation: 'page',
  multiple: true,
  searchable: true,
  createLabel: 'Create label',
} as const;

export function IssueLabels({ issue, editing }: Editable): JSX.Element {
  return (
    <FieldGroup.Picker
      {...labelPicker}
      value={issue.labels.map(({ name }) => name)}
      options={labelOptions(issue, editing)}
      {...choiceState(editing)}
      {...labelEvents(issue.number, editing)}
    >
      {labelValues(issue.labels)}
    </FieldGroup.Picker>
  );
}
