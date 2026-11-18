import {
  FieldGroup,
  SegmentedControl,
  Stack,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { viewOf } from './issue-board';
import {
  assigneeChoices,
  menuFilters,
  sortChoices,
  statusChoices,
  type IssueFilters,
} from './jira-filters';
import type { JiraPerson } from './jira-readers';
import type { Listing } from './view-frame';

type Choice = { value: string; label: string };

const issuesViews: Choice[] = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
];

// List or Board, as Page state: a view switch lives in the page's options, never as a bar across the header.
const viewSwitch = (listing: Listing): JSX.Element => (
  <SegmentedControl
    key="view"
    label="Show issues as"
    options={issuesViews}
    value={viewOf(listing)}
    onValueChange={listing.to.bind('view')}
  />
);

type Field = keyof Pick<IssueFilters, 'status' | 'assignee' | 'sort'>;

type PickerRow = Pick<
  PluginProps['FieldGroup.Picker'],
  'title' | 'presentation' | 'searchable'
>;

// One row of the options: its choices, the one in use checked, and a choice changes the Page state at once.
const picker = (
  { to, filters }: Listing,
  field: Field,
  { row, options }: { row: PickerRow; options: Choice[] },
): JSX.Element => (
  <FieldGroup.Picker
    key={field}
    {...row}
    options={options}
    value={filters[field]}
    onValueChange={to.set({ [field]: to.payload() })}
  />
);

const personChoice = ({ accountId, name }: JiraPerson): Choice => ({
  value: accountId,
  label: name,
});

/*
 * An assignee the choices do not name, such as one past the people Jira lists or set in an address, still shows as
 * the chosen one, so the badge never counts a filter the options hide.
 */
const otherAssignee = (choices: Choice[], assignee: string): Choice[] =>
  choices.some(({ value }) => value === assignee)
    ? []
    : [{ value: assignee, label: 'Someone else' }];

// Anyone, Me and Unassigned, then the people the project can assign to, on a page of their own that searches them.
function assigneeOptions(people: JiraPerson[], listing: Listing): Choice[] {
  const choices = [...assigneeChoices, ...people.map(personChoice)];

  return [...choices, ...otherAssignee(choices, listing.filters.assignee)];
}

const filterSection = (people: JiraPerson[], listing: Listing): JSX.Element => (
  <FieldGroup.Section key="filter" title="Filter">
    {picker(listing, 'status', {
      row: { title: 'Status', presentation: 'menu' },
      options: [...statusChoices],
    })}
    {picker(listing, 'assignee', {
      row: { title: 'Assignee', presentation: 'page', searchable: true },
      options: assigneeOptions(people, listing),
    })}
  </FieldGroup.Section>
);

const sortSection = (listing: Listing): JSX.Element => (
  <FieldGroup.Section key="sort">
    {picker(listing, 'sort', {
      row: { title: 'Sort', presentation: 'menu' },
      options: [...sortChoices],
    })}
  </FieldGroup.Section>
);

/*
 * The header's Options: whether the issues show as a list or a board, the filters (a status category and who the
 * issues are assigned to) and the order Jira lists them in. The search keeps its own text in the header.
 */
export const issueOptions = (
  people: JiraPerson[],
  listing: Listing,
): JSX.Element => (
  <Stack key="options" direction="column" gap={4}>
    {viewSwitch(listing)}
    <FieldGroup key="rows">
      {filterSection(people, listing)}
      {sortSection(listing)}
    </FieldGroup>
  </Stack>
);

type Badge = PluginProps['Screen']['optionsBadge'];

// The Options button counts the filters in use; the search shows its text itself, and the view and order filter nothing.
export const optionsBadge = ({ filters }: Listing): Badge => {
  const count = menuFilters(filters);

  return count > 0 ? { kind: 'count', count } : undefined;
};
