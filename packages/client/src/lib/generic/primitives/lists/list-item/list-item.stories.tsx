import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { Variation, Variations } from '../../../variations';
import { ListItem } from './index';
import type { ListItemProps } from './list-item-props';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem',
  args: { title: 'Build the Session layout' },
  component: ListItem,
} satisfies Meta<typeof ListItem>;

export default meta;

const rows: ListItemProps[] = [
  {
    title: 'Build the Session layout',
  },
  {
    title: 'Answer review comments',
    subtitle: 'Waiting for input',
    selected: true,
    onPress: action('select row'),
  },
  {
    title: 'Deploy web to production',
    subtitle: 'main · Fix cache headers',
    meta: <Pill text="Production" />,
    progress: { value: 0.4, tone: 'success', active: true },
  },
  {
    title: 'Archived Session',
    disabled: true,
    badge: 3,
    onPress: action('select row'),
  },
  {
    title: 'Review comments',
    subtitle: '2 need your attention',
    badge: { kind: 'status', tone: 'warning', label: 'Needs attention' },
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
      <Variation label="One, two and three lines; selected, progress, badge and disabled">
        <Anatomy />
      </Variation>
    </Variations>
  ),
};

function ReferenceRow(): React.JSX.Element {
  return (
    <ListItem
      title="Deploy web to production"
      subtitle="main · Fix cache headers"
      meta={<Pill text="production" />}
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
      title="Build the Session layout"
      subtitle="Claude Code · main"
      meta="2 hours"
    />
    <ListItem isLoading leading={null} title="Answer review comments" />
  </>
);

// A loading row keeps the lines it stands in for, each a bar as wide as its placeholder text; a muted row is an empty section's line.
function LoadingAndEmpty(): React.JSX.Element {
  return (
    <List appearance="cards" maxHeight={400}>
      <List.Section isLoading title="Example Project">
        {loadingRows}
      </List.Section>
      <List.Section title="Empty Project">
        <ListItem title="No Sessions yet." tone="muted" />
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
