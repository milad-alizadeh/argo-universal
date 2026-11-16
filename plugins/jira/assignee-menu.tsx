import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { fieldKeys } from './issue-keys';
import { checks, unassigned, type Showing, type Shown } from './issue-shown';
import type { JiraPerson } from './jira-readers';

/*
 * The issue's Assignee menu: nobody, whoever has it now, then the people its Jira project can assign. Choosing one
 * runs `setAssignee`, and the assignee and the check show it at once until Jira answers.
 */
type Choice = { key: string; name: string; accountId?: string };

const nobody: Choice = { key: 'assign-none', name: unassigned };

const choiceOf = ({ accountId, name }: JiraPerson): Choice => ({
  key: `assign-${accountId}`,
  name,
  accountId,
});

const othersThan = (
  people: JiraPerson[],
  assignee: JiraPerson | null,
): JiraPerson[] =>
  people.filter(({ accountId }) => accountId !== assignee?.accountId);

// Whoever has the issue is offered though Jira's list may not hold them.
function choicesOf({ issue, choices }: Shown): Choice[] {
  const { assignee } = issue;
  const others = othersThan(choices.people, assignee);
  const people = assignee ? [assignee, ...others] : others;

  return [nobody, ...people.map(choiceOf)];
}

const currentKey = ({ issue }: Shown): string =>
  issue.assignee ? choiceOf(issue.assignee).key : nobody.key;

type Choosing = { shown: Shown; keys: string[] };

type AssignArgs = { issue: string; projectId: string; assignee?: string };

const argsOf = (
  { issue, projectId }: Shown,
  { accountId }: Choice,
): AssignArgs =>
  accountId
    ? { issue: issue.key, projectId, assignee: accountId }
    : { issue: issue.key, projectId };

const optimistic = (choice: Choice, keys: string[]): Showing => ({
  optimistic: [
    { key: fieldKeys.assignee, props: { text: choice.name } },
    ...checks(keys, choice.key),
  ],
});

function assignTo({ shown, keys }: Choosing, choice: Choice): JSX.Element {
  const args = argsOf(shown, choice);

  return (
    <Action
      key={choice.key}
      label={choice.name}
      selected={choice.key === currentKey(shown)}
      onPress={shown.to.run('setAssignee', args, optimistic(choice, keys))}
    />
  );
}

export function assigneeMenu(shown: Shown): JSX.Element {
  const choices = choicesOf(shown);
  const keys = choices.map(({ key }) => key);

  return (
    <Action key="assignee-menu" label="Assignee" icon="person">
      <Action.Section key="people" title="Assign to">
        {choices.map((choice) => assignTo({ shown, keys }, choice))}
      </Action.Section>
    </Action>
  );
}
