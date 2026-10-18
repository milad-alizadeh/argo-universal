import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from './grouped-list-section';

const onPress = action('open list item');

const meta = {
  title: 'Design System/Primitives/Lists/GroupedListSection',
  args: { children: null },
  component: GroupedListSection,
  parameters: { screenPreview: true },
} satisfies Meta<typeof GroupedListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => <VariationsExample />,
};

function VariationsExample(): React.JSX.Element {
  return (
    <GroupedList>
      <ServerSection />
      <GroupedListSection>
        <GroupedListItem label="Name" value="Argo" />
      </GroupedListSection>
    </GroupedList>
  );
}

function ServerSection(): React.JSX.Element {
  return (
    <GroupedListSection
      title="Server"
      footer="Server unavailable. Open Connection to reconnect."
    >
      <ProjectsItem />
      <ConnectionItem />
    </GroupedListSection>
  );
}

function ProjectsItem(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Projects"
      icon="folder"
      value="1"
      disabled
      onPress={onPress}
    />
  );
}

function ConnectionItem(): React.JSX.Element {
  return (
    <GroupedListItem
      label="Connection"
      icon="server"
      value="Disconnected"
      onPress={onPress}
    />
  );
}
