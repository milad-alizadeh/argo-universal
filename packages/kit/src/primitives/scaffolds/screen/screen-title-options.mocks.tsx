import { useState, type ReactElement } from 'react';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { SegmentedControl } from '#primitives/controls/segmented-control';
import { FieldGroup } from '#primitives/fields/field-group';
import { ScrollView } from '#primitives/layout/scroll-view';
import { Stack } from '#primitives/layout/stack';
import { Screen, type ScreenProps } from './index';

type Choose = (value: string) => void;

const titleChoices = ['Group one', 'Group two', 'Group three'];

const groupChoice = (
  label: string,
  chosen: string,
  choose: Choose,
): ReactElement => (
  <Action
    key={label}
    label={label}
    selected={label === chosen}
    onPress={() => choose(label)}
  />
);

/*
 * A title menu: the groups the page can show, the shown one checked, and a way to look elsewhere; each Action
 * reports its label.
 */
const exampleTitleMenu = (chosen: string, choose: Choose): ReactElement[] => [
  <Action.Section key="groups" title="example.com">
    {titleChoices.map((label) => groupChoice(label, chosen, choose))}
  </Action.Section>,
  <Action.Section key="elsewhere">
    <Action label="Change place…" onPress={() => choose('Change place')} />
  </Action.Section>,
];

const viewChoices = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
];

const statusChoices = [
  { value: 'any', label: 'Any status' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

interface OptionsState {
  view: string;
  status: string;
  onView: Choose;
  onStatus: Choose;
}

const statusRow = (state: OptionsState): ReactElement => (
  <FieldGroup>
    <FieldGroup.Section title="Filter">
      <FieldGroup.Picker
        title="Status"
        presentation="menu"
        options={statusChoices}
        value={state.status}
        onValueChange={state.onStatus}
      />
    </FieldGroup.Section>
  </FieldGroup>
);

// A page's options: how it shows its items, as a segmented switch, then a filter row.
const exampleOptions = (state: OptionsState): ReactElement => (
  <Stack direction="column" gap={4}>
    <SegmentedControl
      label="Show as"
      options={viewChoices}
      value={state.view}
      onValueChange={state.onView}
    />
    {statusRow(state)}
  </Stack>
);

const search = { label: 'Search' };

// One filter in use counts on the button.
const badgeOf = (status: string): ScreenProps['optionsBadge'] =>
  status === 'any' ? undefined : { kind: 'count', count: 1 };

function useOptionsState(): OptionsState {
  const [view, onView] = useState('list');
  const [status, onStatus] = useState('closed');

  return { view, status, onView, onStatus };
}

/*
 * A Screen whose title picks what it shows and whose Options hold its view and filter, each kept here as a Plugin
 * keeps them in Page state.
 */
export function TitleAndOptionsExample(): ReactElement {
  const [group, setGroup] = useState(titleChoices[0] ?? '');
  const options = useOptionsState();

  const header = {
    titleMenu: exampleTitleMenu(group, setGroup),
    options: exampleOptions(options),
    optionsBadge: badgeOf(options.status),
  };

  return (
    <Screen title={group} caption="example.com" search={search} {...header}>
      <ExampleStatus view={options.view} status={options.status} />
    </Screen>
  );
}

// Scroll as a Screen's list does, keeping the status line below the native navigation bar.
function ExampleStatus({
  view,
  status,
}: Pick<OptionsState, 'view' | 'status'>): ReactElement {
  return (
    <ScrollView>
      <Text>{`Showing ${view}, ${status}`}</Text>
    </ScrollView>
  );
}
