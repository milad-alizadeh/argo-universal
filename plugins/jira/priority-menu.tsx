import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { fieldKeys } from './issue-keys';
import type { JiraPriority } from './issue-readers';
import { checks, type Showing, type Shown } from './issue-shown';

/*
 * The issue's Priority menu: the site's priorities, the issue's own checked. Choosing one runs `setPriority`, and the
 * priority and the check show it at once until Jira answers.
 */
const priorityKey = (name: string): string => `priority-${name}`;

// The issue's own priority alone when Jira could not list them.
function prioritiesOf({ issue, choices }: Shown): JiraPriority[] {
  const own = issue.priority;

  if (choices.priorities.length > 0 || !own) return choices.priorities;

  return [{ id: own, name: own }];
}

type Choosing = { shown: Shown; keys: string[] };

const optimistic = ({ name }: JiraPriority, keys: string[]): Showing => ({
  optimistic: [
    { key: fieldKeys.priority, props: { text: name } },
    ...checks(keys, priorityKey(name)),
  ],
});

function priorityAction(
  { shown, keys }: Choosing,
  priority: JiraPriority,
): JSX.Element {
  const { issue, projectId, to } = shown;
  const args = { issue: issue.key, priority: priority.id, projectId };

  return (
    <Action
      key={priorityKey(priority.name)}
      label={priority.name}
      selected={priority.name === issue.priority}
      onPress={to.run('setPriority', args, optimistic(priority, keys))}
    />
  );
}

export function priorityMenu(shown: Shown): JSX.Element {
  const priorities = prioritiesOf(shown);
  const keys = priorities.map(({ name }) => priorityKey(name));

  return (
    <Action key="priority-menu" label="Priority" icon="flag">
      <Action.Section key="priorities" title="Priority">
        {priorities.map((priority) =>
          priorityAction({ shown, keys }, priority),
        )}
      </Action.Section>
    </Action>
  );
}
