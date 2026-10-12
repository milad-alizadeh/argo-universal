import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Button } from '../../buttons/button/button';
import { ListItem } from '../../lists/list-item/list-item';
import { FieldGroup } from '../field-group/field-group';
import { FieldSection } from '../field-section/field-section';
import { FieldRow } from './field-row';

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
