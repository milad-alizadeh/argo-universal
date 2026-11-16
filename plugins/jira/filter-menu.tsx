import { Action } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { JiraPerson } from './jira-readers';
import {
  activeFilters,
  assigneeChoices,
  statusChoices,
  type IssueFilters,
} from './jira-filters';
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

/*
 * The header's Filter menu: a status category, and who the issues are assigned to, with Me first and then the people
 * the project can assign to. Its badge counts the filters in use, the search's text among them.
 */
export function filterMenu(
  people: JiraPerson[],
  listing: Listing,
): JSX.Element {
  const count = activeFilters(listing.filters);

  return (
    <Action
      key="filter"
      label="Filter"
      icon="filters"
      badge={count > 0 ? { kind: 'count', count } : undefined}
    >
      <Action.Section key="status" title="Status">
        {statusChoices.map((each) => statusChoice(listing, each))}
      </Action.Section>
      <Action.Section key="assignee" title="Assignee">
        {[...assigneeChoices, ...people.map(personChoice)].map((each) =>
          assigneeChoice(listing, each),
        )}
      </Action.Section>
    </Action>
  );
}
