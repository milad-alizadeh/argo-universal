import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import { ListItem } from '#primitives/lists/list-item/list-item-view';
import { FieldGroup } from './field-group-view';

const onPress = action('open list item');

const meta = {
  title: 'Design System/Primitives/FieldGroup',
  args: { children: null },
  component: FieldGroup,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => <VariationsExample />,
};

function VariationsExample(): React.JSX.Element {
  return (
    <FieldGroup>
      <ServerSection />
      <DeviceSection />
    </FieldGroup>
  );
}

function ServerSection(): React.JSX.Element {
  return (
    <FieldSection title="Server">
      <ListItem
        title="Projects"
        icon="folder"
        value="1"
        needsAttention
        onPress={onPress}
      />
      <ListItem title="Agents" icon="agent" value="2" onPress={onPress} />
    </FieldSection>
  );
}

function DeviceSection(): React.JSX.Element {
  return (
    <FieldSection title="This device">
      <ListItem
        title="Appearance"
        icon="appearance"
        value="System"
        onPress={onPress}
      />
    </FieldSection>
  );
}
