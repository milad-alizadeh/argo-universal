import { Avatar, FieldGroup, Label } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import {
  choiceState,
  type Choice,
  type Editable,
  type IssueEditing,
  type Run,
} from './issue-pickers';

// The people the repository offers, with the Issue's own beside them.
const peopleOptions = (issue: Issue, editing: IssueEditing): Choice[] =>
  [...new Set([...(editing.choices?.assignees ?? []), ...issue.assignees])].map(
    (value) => ({ value, label: value, avatar: true }),
  );

const assigneeEdit = (number: number, { to, projectId }: IssueEditing): Run =>
  to.run('setAssignee', {
    number,
    assignee: to.payload('value'),
    on: to.payload('on'),
    projectId,
  });

// A person's avatar and name for each assignee, or None.
const assigneeValues = (names: string[]): JSX.Element | JSX.Element[] =>
  names.length === 0 ? (
    <Label text="None" />
  ) : (
    names.map((name) => (
      <Avatar key={name} name={name} accessibilityLabel={name} />
    ))
  );

const assigneePicker = {
  title: 'Assignees',
  presentation: 'page',
  multiple: true,
  searchable: true,
} as const;

export function Assignees({ issue, editing }: Editable): JSX.Element {
  return (
    <FieldGroup.Picker
      {...assigneePicker}
      value={issue.assignees}
      options={peopleOptions(issue, editing)}
      {...choiceState(editing)}
      onToggle={assigneeEdit(issue.number, editing)}
    >
      {assigneeValues(issue.assignees)}
    </FieldGroup.Picker>
  );
}
