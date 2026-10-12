import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Button } from './button';
import { FieldGroup } from './field-group';
import { FieldRow } from './field-row';
import { FieldSection } from './field-section';
import { ListItem } from './list-item';

const meta = {
  title: 'Design System/Primitives/FieldRow',
  args: { children: null },
  component: FieldRow,
  parameters: { screenPreview: true },
} satisfies Meta<typeof FieldRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  render: () => (
    <FieldGroup>
      <FieldSection title="Program">
        <ListItem title="Name" value="Example ACP" />
      </FieldSection>
      <FieldRow>
        <Button fullWidth="narrow" label="Save" onPress={action('save')} />
      </FieldRow>
    </FieldGroup>
  ),
};
