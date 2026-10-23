import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldToggle } from './field-toggle';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldToggle',
  component: FieldToggle,
  args: { title: 'Label', value: true, onValueChange: fn() },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Flips: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByText('Label'));
    await expect(args.onValueChange).toHaveBeenCalledWith(false);
  },
};

export const IsASwitchNamedByItsTitle: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const toggle = canvas.getByRole('switch', { name: 'Label' });
    await expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await expect(args.onValueChange).toHaveBeenCalledWith(false);
  },
};
