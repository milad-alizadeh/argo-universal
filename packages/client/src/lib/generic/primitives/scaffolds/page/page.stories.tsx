import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Variation, Variations } from '../../../variations';
import { Page, type PageProps } from './index';
import { exampleSubmenu } from './page-submenu-example.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Page',
  component: Page,
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

export const States: Story = {
  name: 'Page',
  args: { title: 'Projects' },
  render: () => <PageVariations />,
};

const examples = [
  { label: 'Title' },
  { label: 'Actions', actions: true },
  { label: 'Actions, with a submenu', actions: true, submenu: true },
  { label: 'Search', search: true },
  { label: 'Primary action', search: true, primary: true },
  { label: 'Drill-in, with Back and a caption', drillIn: true },
];

function PageVariations(): React.JSX.Element {
  return (
    <Variations>
      {examples.map(({ label, ...props }) => (
        <Variation key={label} label={label}>
          <PageExample {...props} />
        </Variation>
      ))}
    </Variations>
  );
}

type Example = {
  search?: boolean;
  actions?: boolean;
  submenu?: boolean;
  primary?: boolean;
  drillIn?: boolean;
};

function PageExample(props: Example): React.JSX.Element {
  const [query, onChangeText] = useState('');
  const [result, setResult] = useState('');

  const page = exampleProps(props, { query, onChangeText, setResult });

  return (
    <Page {...page}>
      <ExampleContent query={query} />
      <Text>{result}</Text>
    </Page>
  );
}

function primaryAction(
  shown: boolean | undefined,
  choose: (value: string) => void,
): PageProps['primaryAction'] {
  return shown ? (
    <Action
      label="Add Project"
      icon="add"
      onPress={() => choose('New Project')}
    />
  ) : undefined;
}

function ExampleContent({ query }: { query: string }): React.JSX.Element {
  const items = ['argo-universal', 'website']
    .values()
    .filter((name) => name.includes(query))
    .map((title) => <ListItem key={title} title={title} />)
    .toArray();

  return (
    <List>
      <List.Section>{items}</List.Section>
    </List>
  );
}

interface ExampleActionsProps {
  choose: (result: string) => void;
  submenu?: boolean;
}

function ExampleActions({
  choose,
  submenu,
}: ExampleActionsProps): React.JSX.Element {
  return (
    <ActionList>
      {exampleActions.map((action) => (
        <Action key={action.label} {...exampleAction(action, choose)} />
      ))}
      {submenu ? exampleSubmenu(choose) : null}
    </ActionList>
  );
}

function exampleAction(
  action: (typeof exampleActions)[number],
  choose: (value: string) => void,
): typeof action & { onPress: () => void } {
  return { ...action, onPress: () => choose(action.label) };
}

const exampleActions = [
  { label: 'Filters', icon: 'filters' },
  { label: 'Archived', icon: 'archive' },
] as const;

interface ExampleState {
  query: string;
  onChangeText: (value: string) => void;
  setResult: (value: string) => void;
}

function exampleProps(props: Example, state: ExampleState): PageProps {
  const search = props.search ? { label: 'Search Projects' } : undefined;

  return {
    title: 'Projects',
    value: state.query,
    onChangeText: state.onChangeText,
    search,
    primaryAction: primaryAction(props.primary, state.setResult),
    actions: exampleHeaderActions(props, state.setResult),
    ...drillIn(props.drillIn, state.setResult),
  };
}

// Back and the caption show on a wide window only.
function drillIn(
  shown: boolean | undefined,
  choose: (value: string) => void,
): Pick<PageProps, 'caption' | 'onBack'> {
  if (!shown) return {};

  return {
    caption: 'Projects on this Mac',
    onBack: () => choose('Back'),
  };
}

function exampleHeaderActions(
  { actions, submenu }: Example,
  choose: (value: string) => void,
): React.ReactNode {
  return actions ? (
    <ExampleActions choose={choose} submenu={submenu} />
  ) : undefined;
}
