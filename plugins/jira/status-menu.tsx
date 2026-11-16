import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraTransition } from './issue-fields';
import { fieldKeys } from './issue-keys';
import { categoryTones } from './issue-rows';
import type { Showing, Shown } from './issue-shown';

/*
 * The issue's Status menu: only the statuses Jira allows from the current one, each named by where it leads. Choosing
 * one runs `transition`, and the issue's status shows it at once until Jira answers.
 */
// The issue's status shows where it is going until Jira answers.
const optimistic = ({ to }: JiraTransition): Showing => ({
  optimistic: [
    {
      key: fieldKeys.status,
      props: { text: to.name, tone: categoryTones[to.category] },
    },
  ],
});

function moveTo(shown: Shown, transition: JiraTransition): JSX.Element {
  const { issue, projectId, to } = shown;
  const args = { issue: issue.key, status: transition.to.id, projectId };

  return (
    <Action
      key={`move-${transition.id}`}
      label={transition.to.name}
      onPress={to.run('transition', args, optimistic(transition))}
    />
  );
}

const noMoves = ({ to }: Shown): JSX.Element => (
  <Action
    key="no-moves"
    label="No moves allowed"
    disabled
    onPress={to.run('checkAgain', {})}
  />
);

const movesOf = ({ issue }: Shown): JiraTransition[] =>
  issue.transitions.filter(({ to }) => to.id !== issue.status.id);

export function statusMenu(shown: Shown): JSX.Element {
  const moves = movesOf(shown);

  return (
    <Action key="status-menu" label="Status" icon="issue">
      <Action.Section
        key="moves"
        title={`Move from ${shown.issue.status.name}`}
      >
        {moves.length === 0
          ? noMoves(shown)
          : moves.map((transition) => moveTo(shown, transition))}
      </Action.Section>
    </Action>
  );
}
