import { Metadata } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import {
  choiceState,
  type Choice,
  type Editable,
  type MetadataEditing,
  type Run,
} from './issue-pickers';

// The people the repository offers, with the Issue's own beside them.
const peopleOptions = (issue: Issue, editing: MetadataEditing): Choice[] =>
  [...new Set([...(editing.choices?.assignees ?? []), ...issue.assignees])].map(
    (value) => ({ value, label: value, avatar: true }),
  );

const assigneeEdit = (
  number: number,
  { to, projectId }: MetadataEditing,
): Run =>
  to.run('setAssignee', {
    number,
    assignee: to.payload('value'),
    on: to.payload('on'),
    projectId,
  });

function AssigneeValues({ names }: { names: string[] }): JSX.Element {
  if (names.length === 0)
    return <Metadata.Label title="Assignees" text="None" />;

  return (
    <>
      {names.map((name) => (
        <Metadata.Avatar key={name} title="Assignees" name={name} />
      ))}
    </>
  );
}

const assigneePicker = {
  title: 'Assignees',
  multiple: true,
  searchable: true,
} as const;

export function Assignees({ issue, editing }: Editable): JSX.Element {
  return (
    <Metadata.Picker
      {...assigneePicker}
      value={issue.assignees}
      options={peopleOptions(issue, editing)}
      {...choiceState(editing)}
      onToggle={assigneeEdit(issue.number, editing)}
    >
      <AssigneeValues names={issue.assignees} />
    </Metadata.Picker>
  );
}
