import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';

const onPress = action('open list item');
const meta = {
  title: 'Primitives/ListItem',
  args: { title: 'Name' },
  component: ListItem,
  parameters: { screenPreview: true },
} satisfies Meta<typeof ListItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <FieldGroup>
      <FieldSection title="With icons">
        <ListItem
          title="Projects"
          icon="folder"
          value="1"
          needsAttention
          onPress={onPress}
        />
        <ListItem
          title="Agents"
          icon="agent"
          value="2"
          disabled
          onPress={onPress}
        />
        <ListItem
          title="Appearance"
          icon="appearance"
          value="System"
          onPress={onPress}
        />
      </FieldSection>
      <FieldSection title="Without icons">
        <ListItem title="Name" value="Argo" onPress={onPress} />
        <ListItem title="Version" value="1.0" />
      </FieldSection>
    </FieldGroup>
  ),
};
