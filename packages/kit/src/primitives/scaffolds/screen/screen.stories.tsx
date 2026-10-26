import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { withStack } from '#story-stack';
import { Screen, type ScreenProps } from './index';
import { exampleSubmenu } from './screen-submenu-example.mocks';
import { WidthExample } from './screen-width.mocks';

const meta = {
  title: 'Design System/Primitives/Scaffolds/Screen',
  component: Screen,
  args: { title: 'Title' },
  argTypes: kitArgTypes('Screen'),
  // A Screen fills its window; in the preview's centred layout the stack around it has no width of its own.
  parameters: { screenPreview: true },
  // A phone's Screen fills the header of the stack it sits in, so each state draws inside one (see screen-stack.stories.tsx).
  decorators: [withStack()],
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

// Screen holds its own search text and the result of the action a reader picks, so each state draws the example rather than passing args.
export const TitleOnly: Story = { render: () => <ScreenExample /> };

export const Actions: Story = { render: () => <ScreenExample actions /> };

export const Submenu: Story = {
  render: () => <ScreenExample actions submenu />,
  parameters: {
    docs: { description: { story: 'An action list with a submenu.' } },
  },
};

export const Search: Story = { render: () => <ScreenExample search /> };

export const PrimaryAction: Story = {
  render: () => <ScreenExample search primary />,
};

export const DrillIn: Story = {
  render: () => <ScreenExample drillIn />,
  parameters: {
    docs: {
      description: {
        story: 'Back and the caption show on a wide window only.',
      },
    },
  },
};

// Content keeps to the title's column: on a wide window as wide as the reading width, centred.
export const ReadingColumn: Story = {
  args: { width: 'content' },
  render: (args) => <WidthExample width={args.width} />,
};

// A table, board or canvas fills the window, inside the same side margins.
export const FullWidth: Story = {
  args: { width: 'full' },
  render: (args) => <WidthExample width={args.width} />,
};

type Example = {
  search?: boolean;
  actions?: boolean;
  submenu?: boolean;
  primary?: boolean;
  drillIn?: boolean;
};

function ScreenExample(props: Example): React.JSX.Element {
  const [query, onChangeText] = useState('');
  const [result, setResult] = useState('');

  const page = exampleProps(props, { query, onChangeText, setResult });

  return (
    <Screen {...page}>
      <ExampleContent query={query} />
      <Text>{result}</Text>
    </Screen>
  );
}

function primaryAction(
  shown: boolean | undefined,
  choose: (value: string) => void,
): ScreenProps['primaryAction'] {
  return shown ? (
    <Action label="Add" icon="add" onPress={() => choose('Added')} />
  ) : undefined;
}

function ExampleContent({ query }: { query: string }): React.JSX.Element {
  const items = ['Item one', 'Item two']
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

// The header's Actions as elements: a Screen reads the Actions it is given, so they are not wrapped in a component.
function exampleActionElements(
  choose: (result: string) => void,
  submenu?: boolean,
): React.JSX.Element {
  return (
    <>
      {exampleActions.map((action) => (
        <Action key={action.label} {...exampleAction(action, choose)} />
      ))}
      {submenu ? exampleSubmenu(choose) : null}
    </>
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
  { label: 'Archive', icon: 'archive' },
] as const;

interface ExampleState {
  query: string;
  onChangeText: (value: string) => void;
  setResult: (value: string) => void;
}

function exampleProps(props: Example, state: ExampleState): ScreenProps {
  const search = props.search ? { label: 'Search' } : undefined;

  return {
    title: 'Title',
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
): Pick<ScreenProps, 'caption' | 'onBack'> {
  if (!shown) return {};

  return {
    caption: 'Caption',
    onBack: () => choose('Back'),
  };
}

function exampleHeaderActions(
  { actions, submenu }: Example,
  choose: (value: string) => void,
): React.ReactNode {
  return actions ? exampleActionElements(choose, submenu) : undefined;
}
