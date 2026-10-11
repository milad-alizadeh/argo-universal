import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { FieldGroup } from './field-group';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';

const onPress = action('open list item');
const meta = {
  title: 'Primitives/FieldGroup',
  args: { children: null },
  component: FieldGroup,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <FieldGroup>
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
      <FieldSection title="This device">
        <ListItem
          title="Appearance"
          icon="appearance"
          value="System"
          onPress={onPress}
        />
      </FieldSection>
    </FieldGroup>
  ),
};
