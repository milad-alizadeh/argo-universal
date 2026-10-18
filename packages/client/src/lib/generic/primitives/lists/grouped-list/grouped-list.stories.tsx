import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedList } from './grouped-list';

const onPress = action('open list item');

const meta = {
  title: 'Design System/Primitives/Lists/GroupedList',
  args: { children: null },
  component: GroupedList,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => <VariationsExample />,
};

function VariationsExample(): React.JSX.Element {
  return (
    <GroupedList>
      <ServerSection />
      <DeviceSection />
    </GroupedList>
  );
}

const serverRows = [
  { label: 'Projects', icon: 'folder', value: '1', needsAttention: true },
  { label: 'Agents', icon: 'agent', value: '2' },
] as const;

function ServerSection(): React.JSX.Element {
  return (
    <GroupedListSection title="Server">
      {serverRows.map((row) => (
        <GroupedListItem key={row.label} {...row} onPress={onPress} />
      ))}
    </GroupedListSection>
  );
}

function DeviceSection(): React.JSX.Element {
  return (
    <GroupedListSection title="This device">
      <GroupedListItem
        label="Appearance"
        icon="appearance"
        value="System"
        onPress={onPress}
      />
    </GroupedListSection>
  );
}
