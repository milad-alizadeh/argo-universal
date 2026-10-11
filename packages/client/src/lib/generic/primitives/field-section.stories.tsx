import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';

const onPress = action('open list item');
const meta = {
  title: 'Primitives/FieldSection',
  args: { children: null },
  component: FieldSection,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <FieldGroup>
      <FieldSection
        title="Server"
        footer="Server unavailable. Open Connection to reconnect."
      >
        <ListItem
          title="Projects"
          icon="folder"
          value="1"
          disabled
          onPress={onPress}
        />
        <ListItem
          title="Connection"
          icon="server"
          value="Disconnected"
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection>
        <ListItem title="Name" value="Argo" />
      </FieldSection>
    </FieldGroup>
  ),
};
