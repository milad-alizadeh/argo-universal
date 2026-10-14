import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Button } from '#primitives/buttons/button';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from '#primitives/lists/list-item';
import { FieldGroupContent } from './field-group-content';

const meta = {
  title: 'Design System/Primitives/FieldGroupContent',
  args: { children: null },
  component: FieldGroupContent,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldGroupContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <FieldGroup>
      <FieldSection title="Program">
        <ListItem title="Name" value="Example ACP" />
      </FieldSection>
      <FieldGroupContent>
        <Button fullWidth="narrow" label="Save" onPress={action('save')} />
      </FieldGroupContent>
    </FieldGroup>
  ),
};
