import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { FieldGroup } from '#primitives/fields/field-group';
import { ListItem } from '#primitives/lists/list-item';
import { FieldSection } from './field-section';

const onPress = action('open list item');

const meta = {
  title: 'Design System/Primitives/FieldSection',
  args: { children: null },
  component: FieldSection,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => <VariationsExample />,
};

function VariationsExample(): React.JSX.Element {
  return (
    <FieldGroup>
      <ServerSection />
      <FieldSection>
        <ListItem title="Name" value="Argo" />
      </FieldSection>
    </FieldGroup>
  );
}

function ServerSection(): React.JSX.Element {
  return (
    <FieldSection
      title="Server"
      footer="Server unavailable. Open Connection to reconnect."
    >
      <ProjectsItem />
      <ConnectionItem />
    </FieldSection>
  );
}

function ProjectsItem(): React.JSX.Element {
  return (
    <ListItem
      title="Projects"
      icon="folder"
      value="1"
      disabled
      onPress={onPress}
    />
  );
}

function ConnectionItem(): React.JSX.Element {
  return (
    <ListItem
      title="Connection"
      icon="server"
      value="Disconnected"
      onPress={onPress}
    />
  );
}
