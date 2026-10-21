import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Slider } from '#primitives/inputs/slider';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { Variation, Variations } from '../../../variations';
import { ListItem } from './index';
import type { ListItemProps } from './list-item-props';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem',
  args: { title: 'Item one' },
  component: ListItem,
  argTypes: kitArgTypes('ListItem'),
} satisfies Meta<typeof ListItem>;

export default meta;

const rows: ListItemProps[] = [
  {
    title: 'Item one',
  },
  {
    title: 'Item two',
    subtitle: 'Subtitle',
    selected: true,
    onPress: action('select row'),
  },
  {
    title: 'Item three',
    subtitle: 'Subtitle',
    meta: <Pill text="Meta" />,
    progress: { value: 0.4, tone: 'success', active: true },
  },
  {
    title: 'Disabled item',
    disabled: true,
    badge: 3,
    onPress: action('select row'),
  },
  {
    title: 'Item four',
    subtitle: 'Subtitle',
    badge: { kind: 'status', tone: 'warning', label: 'Warning' },
  },
  {
    title: 'Effort',
    value: 'High',
    control: (
      <Slider
        accessibilityLabel="Effort"
        valueLabel="High"
        minimumValue={0}
        maximumValue={3}
        step={1}
        value={2}
        onValueChange={action('change effort')}
      />
    ),
  },
];

function Anatomy(): React.JSX.Element {
  return (
    <List
      appearance="cards"
      maxHeight={900}
      items={rows}
      keyExtractor={(row) => row.title}
      renderItem={(row) => <ListItem {...row} />}
    />
  );
}

export const Overview: StoryObj<typeof meta> = {
  name: 'ListItem',
  render: () => (
    <Variations>
      <Variation label="One, two and three lines; selected, progress, badge, disabled and a control">
        <Anatomy />
      </Variation>
    </Variations>
  ),
};

function ReferenceRow(): React.JSX.Element {
  return (
    <ListItem
      title="Item three"
      subtitle="Subtitle"
      meta={<Pill text="Meta" />}
      progress={{ value: 7 / 12, tone: 'info' }}
    />
  );
}

export const PaperReference: StoryObj<typeof meta> = {
  render: () => (
    <View className="w-90">
      <List appearance="cards" maxHeight={200}>
        <ReferenceRow />
      </List>
    </View>
  ),
};

const loadingRows = (
  <>
    <ListItem
      isLoading
      leading={null}
      title="Item one"
      subtitle="Subtitle"
      meta="Meta"
    />
    <ListItem isLoading leading={null} title="Item two" />
  </>
);

// A loading row keeps the lines it stands in for, each a bar as wide as its placeholder text; a muted row is an empty section's line.
function LoadingAndEmpty(): React.JSX.Element {
  return (
    <List appearance="cards" maxHeight={400}>
      <List.Section isLoading title="Section">
        {loadingRows}
      </List.Section>
      <List.Section title="Empty section">
        <ListItem title="No items" tone="muted" />
      </List.Section>
    </List>
  );
}

export const LoadingAndMuted: StoryObj<typeof meta> = {
  name: 'Loading and muted',
  render: () => (
    <Variations>
      <Variation label="isLoading rows under a loading section header; a muted row">
        <LoadingAndEmpty />
      </Variation>
    </Variations>
  ),
};
