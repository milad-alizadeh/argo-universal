import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldPicker } from './field-picker';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldPicker',
  component: FieldPicker,
  args: {
    title: 'Label',
    value: 'two',
    options: [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
      { value: 'three', label: 'Three' },
    ],
    onValueChange: fn(),
  },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsTitle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Label')).toBeVisible();
  },
};
