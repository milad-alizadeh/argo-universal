import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Button } from '#primitives/buttons/button/button-view';
import { FieldGroup } from '#primitives/fields/field-group/field-group-view';
import { FieldSection } from '#primitives/fields/field-section/field-section-view';
import { ListItem } from '#primitives/lists/list-item/list-item-view';
import { FieldRow } from './field-row-view';

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
