import {
  Action,
  Button,
  Callout,
  Detail,
  EmptyState,
  Metadata,
  Pill,
  Screen,
  Stack,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { issueUrl } from './atlassian';
import { fieldKeys } from './issue-keys';
import { categoryTones } from './issue-rows';
import type {
  JiraFailure,
  JiraIssue,
  JiraPerson,
  JiraPriority,
  JiraTransition,
} from './jira-client';
import { projectPath } from './jira-paths';
import type { EditChoices } from './jira-reads';
import type { JiraSite } from './jira-store';
import { signInPath } from './sign-in-page';

/*
 * One Jira issue's page: its description, its properties beside it, and the header menus that change its status,
 * assignee and priority. Each change is an Operation whose optimistic props show the new value at once; the App puts
 * the old one back, with an error toast, when Jira refuses it.
 */
export type IssueView =
  | { kind: 'issue'; site: JiraSite; issue: JiraIssue; choices: EditChoices }
  | { kind: 'signed-out'; message: string | null }
  | { kind: 'no-site' }
  | { kind: 'failed'; failure: JiraFailure };

type IssueTo = PageTo<Record<never, never>>;

type Shown = {
  site: JiraSite;
  issue: JiraIssue;
  choices: EditChoices;
  projectId: string;
  to: IssueTo;
};

type Patches = NonNullable<ReturnType<IssueTo['run']>['optimistic']>;

const personIcon = { sf: 'person', material: 'person' } as const;

const priorityIcon = { sf: 'flag', material: 'flag' } as const;

const unassigned = 'Unassigned';

const noPriority = 'None';

function Labels({ labels }: { labels: string[] }): JSX.Element {
  return (
    <Metadata.Pills title="Labels">
      {labels.length === 0 ? (
        <Pill text="None" tone="muted" />
      ) : (
        labels.map((label) => <Pill key={label} text={label} />)
      )}
    </Metadata.Pills>
  );
}

// The issue's own properties: its status, who has it, how urgent it is, its labels, and its key as the link to Jira.
const properties = ({ site, issue }: Shown): JSX.Element => (
  <Metadata>
    <Metadata.StatusDot
      key={fieldKeys.status}
      title="Status"
      text={issue.status.name}
      tone={categoryTones[issue.status.category]}
    />
    <Metadata.Label
      key={fieldKeys.assignee}
      title="Assignee"
      icon={personIcon}
      text={issue.assignee?.name ?? unassigned}
    />
    <Metadata.Label
      key={fieldKeys.priority}
      title="Priority"
      icon={priorityIcon}
      text={issue.priority ?? noPriority}
    />
    <Labels labels={issue.labels} />
    <Metadata.Link
      title="Jira"
      text={issue.key}
      href={issueUrl(site.host, issue.key)}
    />
  </Metadata>
);

// A menu of choices marks the one in use; choosing another moves the check with the property.
const checks = (keys: string[], chosen: string): Patches =>
  keys.map((key) => ({ key, props: { selected: key === chosen } }));

const moveKey = (transition: JiraTransition): string => `move-${transition.id}`;

const moveAction = (shown: Shown, transition: JiraTransition): JSX.Element => {
  const { issue, projectId, to } = shown;

  return (
    <Action
      key={moveKey(transition)}
      label={transition.to.name}
      onPress={to.run(
        'transition',
        { issue: issue.key, status: transition.to.id, projectId },
        {
          optimistic: [
            {
              key: fieldKeys.status,
              props: {
                text: transition.to.name,
                tone: categoryTones[transition.to.category],
              },
            },
          ],
        },
      )}
    />
  );
};

// Only the statuses Jira allows from the current one are offered, each named by where it leads.
function statusMenu(shown: Shown): JSX.Element {
  const moves = shown.issue.transitions.filter(
    (transition) => transition.to.id !== shown.issue.status.id,
  );

  return (
    <Action key="status-menu" label="Status" icon="issue">
      <Action.Section
        key="moves"
        title={`Move from ${shown.issue.status.name}`}
      >
        {moves.length === 0 ? (
          <Action
            key="no-moves"
            label="No moves allowed"
            disabled
            onPress={shown.to.run('checkAgain', {})}
          />
        ) : (
          moves.map((transition) => moveAction(shown, transition))
        )}
      </Action.Section>
    </Action>
  );
}

const assignKey = (accountId: string | null): string =>
  `assign-${accountId ?? 'none'}`;

// The people to offer: whoever has the issue now, though Jira's list may not hold them, then the rest.
function assignees(shown: Shown): JiraPerson[] {
  const { assignee } = shown.issue;
  const others = shown.choices.people.filter(
    ({ accountId }) => accountId !== assignee?.accountId,
  );

  return assignee ? [assignee, ...others] : others;
}

function assignAction(
  shown: Shown,
  person: JiraPerson | null,
  keys: string[],
): JSX.Element {
  const { issue, projectId, to } = shown;
  const key = assignKey(person?.accountId ?? null);
  const current = assignKey(issue.assignee?.accountId ?? null);
  const args = person
    ? { issue: issue.key, assignee: person.accountId, projectId }
    : { issue: issue.key, projectId };

  return (
    <Action
      key={key}
      label={person?.name ?? unassigned}
      selected={key === current}
      onPress={to.run('setAssignee', args, {
        optimistic: [
          {
            key: fieldKeys.assignee,
            props: { text: person?.name ?? unassigned },
          },
          ...checks(keys, key),
        ],
      })}
    />
  );
}

function assigneeMenu(shown: Shown): JSX.Element {
  const people = assignees(shown);
  const keys = [
    assignKey(null),
    ...people.map(({ accountId }) => assignKey(accountId)),
  ];

  return (
    <Action key="assignee-menu" label="Assignee" icon="person">
      <Action.Section key="people" title="Assign to">
        {assignAction(shown, null, keys)}
        {people.map((person) => assignAction(shown, person, keys))}
      </Action.Section>
    </Action>
  );
}

const priorityKey = (name: string): string => `priority-${name}`;

// The site's priorities, or the issue's own alone when Jira could not list them.
function priorities(shown: Shown): JiraPriority[] {
  const { priority } = shown.issue;
  const listed = shown.choices.priorities;

  if (listed.length > 0 || !priority) return listed;

  return [{ id: priority, name: priority }];
}

function priorityAction(
  shown: Shown,
  priority: JiraPriority,
  keys: string[],
): JSX.Element {
  const { issue, projectId, to } = shown;
  const key = priorityKey(priority.name);

  return (
    <Action
      key={key}
      label={priority.name}
      selected={priority.name === issue.priority}
      onPress={to.run(
        'setPriority',
        { issue: issue.key, priority: priority.id, projectId },
        {
          optimistic: [
            { key: fieldKeys.priority, props: { text: priority.name } },
            ...checks(keys, key),
          ],
        },
      )}
    />
  );
}

function priorityMenu(shown: Shown): JSX.Element {
  const listed = priorities(shown);
  const keys = listed.map(({ name }) => priorityKey(name));

  return (
    <Action key="priority-menu" label="Priority" icon="flag">
      <Action.Section key="priorities" title="Priority">
        {listed.map((priority) => priorityAction(shown, priority, keys))}
      </Action.Section>
    </Action>
  );
}

const shownIssue = (shown: Shown): JSX.Element => (
  <Screen
    title={shown.issue.summary || shown.issue.key}
    actions={[statusMenu(shown), assigneeMenu(shown), priorityMenu(shown)]}
    aside={properties(shown)}
  >
    <Detail markdown={shown.issue.description || '_No description._'} />
  </Screen>
);

const failureTitles: Record<JiraFailure['kind'], string> = {
  'signed-out': 'Sign in to Jira',
  forbidden: 'Jira refused this',
  'not-found': 'Jira couldn’t find this issue',
  'rate-limited': 'Jira is busy',
  failed: 'Couldn’t read this issue',
};

type Framing = { key: string; projectId: string; to: IssueTo };

const failed = (failure: JiraFailure, { key, to }: Framing): JSX.Element => (
  <Screen title={key}>
    <Callout
      tone="danger"
      title={failureTitles[failure.kind]}
      description={failure.message}
      actions={<Button label="Try again" onPress={to.run('checkAgain', {})} />}
    />
  </Screen>
);

const signedOut = (
  message: string | null,
  { key, to }: Framing,
): JSX.Element => (
  <Screen title={key}>
    <EmptyState
      title="Sign in to Jira"
      description={message ?? 'Sign in to Jira to see this issue.'}
      action={<Button label="Sign in" onPress={to.go(signInPath)} />}
    />
  </Screen>
);

const noSite = ({ key, projectId, to }: Framing): JSX.Element => (
  <Screen title={key}>
    <Stack direction="column" gap={6}>
      <EmptyState
        title="Choose a Jira site"
        description="Choose the Atlassian site this Project’s issues are on to see this issue."
        action={
          <Button
            label="Choose a site"
            onPress={to.go(projectPath(projectId))}
          />
        }
      />
    </Stack>
  </Screen>
);

export function issueScreen(view: IssueView, framing: Framing): JSX.Element {
  switch (view.kind) {
    case 'issue':
      return shownIssue({
        ...view,
        projectId: framing.projectId,
        to: framing.to,
      });
    case 'signed-out':
      return signedOut(view.message, framing);
    case 'no-site':
      return noSite(framing);
    case 'failed':
      return failed(view.failure, framing);
  }
}
