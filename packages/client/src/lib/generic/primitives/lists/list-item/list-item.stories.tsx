import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Icon } from '#primitives/content/icon';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { Variation, Variations } from '../../../variations';
import { ListItem } from './list-item';
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
    leading: <Icon role="body" name="agent" />,
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
    leading: <Icon role="body" name="code" />,
    meta: (
      <>
        <Label icon="check" text="2/5 jobs" />
        <Pill text="Production" />
      </>
    ),
    progress: { value: 0.4, tone: 'success', active: true },
  },
  {
    title: 'Archived Session',
    disabled: true,
    badge: 3,
    leading: <Icon role="body" name="archive" />,
    onPress: action('select row'),
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

function ReferenceMeta(): React.JSX.Element {
  return (
    <>
      <Label icon="checklist" text="7/12 jobs" />
      <Label icon={{ sf: 'clock', material: 'schedule' }} text="3m 40s" />
      <Pill text="production" />
    </>
  );
}

const referenceTime = (
  <Text role="secondary" tone="muted">
    now
  </Text>
);

function ReferenceRow(): React.JSX.Element {
  return (
    <ListItem
      title="Deploy web to production"
      subtitle="main · Fix cache headers"
      leading={<Icon role="body" name="code-map" />}
      trailing={referenceTime}
      meta={<ReferenceMeta />}
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
