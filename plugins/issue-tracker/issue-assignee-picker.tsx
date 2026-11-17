import { FieldGroup } from '@argo/plugin-kit';
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
      summary={issue.assignees.length === 0 ? 'None' : undefined}
    />
  );
}
