import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  assigneeChoices,
  menuFilters,
  statusChoices,
  type IssueFilters,
} from './jira-filters';
import type { JiraPerson } from './jira-readers';
import type { Listing } from './view-frame';

type Choice<Value extends string> = { value: Value; label: string };

// One choice of a filter: checked while it is the one in use, and pressing it changes the Page state at once.
const choice = (
  { value, label }: Choice<string>,
  selected: boolean,
  onPress: ReturnType<Listing['to']['set']>,
): JSX.Element => (
  <Action key={value} label={label} selected={selected} onPress={onPress} />
);

const statusChoice = (
  { to, filters }: Listing,
  each: Choice<IssueFilters['status']>,
): JSX.Element =>
  choice(each, filters.status === each.value, to.set({ status: each.value }));

const assigneeChoice = (
  { to, filters }: Listing,
  each: Choice<string>,
): JSX.Element =>
  choice(
    each,
    filters.assignee === each.value,
    to.set({ assignee: each.value }),
  );

const personChoice = ({ accountId, name }: JiraPerson): Choice<string> => ({
  value: accountId,
  label: name,
});

const statusSection = (listing: Listing): JSX.Element => (
  <Action.Section key="status" title="Status">
    {statusChoices.map((each) => statusChoice(listing, each))}
  </Action.Section>
);

const offered = (choices: Choice<string>[], value: string): boolean =>
  choices.some((each) => each.value === value);

/*
 * An assignee the menu does not name, such as one past the people Jira lists or set in an address, still shows as
 * the checked choice, so the badge never counts a filter the menu hides.
 */
const otherAssignee = (
  choices: Choice<string>[],
  { assignee }: IssueFilters,
): Choice<string>[] =>
  offered(choices, assignee)
    ? []
    : [{ value: assignee, label: 'Someone else' }];

// Anyone, Me and Unassigned, then the people the project can assign to.
function assigneeSection(people: JiraPerson[], listing: Listing): JSX.Element {
  const choices = [...assigneeChoices, ...people.map(personChoice)];
  const all = [...choices, ...otherAssignee(choices, listing.filters)];

  return (
    <Action.Section key="assignee" title="Assignee">
      {all.map((each) => assigneeChoice(listing, each))}
    </Action.Section>
  );
}

type Badge = { kind: 'count'; count: number } | undefined;

const badgeOf = (count: number): Badge =>
  count > 0 ? { kind: 'count', count } : undefined;

/*
 * The header's Filter menu: a status category, and who the issues are assigned to. Its badge counts its own choices
 * in use; the search shows its text itself.
 */
export const filterMenu = (
  people: JiraPerson[],
  listing: Listing,
): JSX.Element => (
  <Action
    key="filter"
    label="Filter"
    icon="filters"
    badge={badgeOf(menuFilters(listing.filters))}
  >
    {statusSection(listing)}
    {assigneeSection(people, listing)}
  </Action>
);
