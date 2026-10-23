import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldText } from './field-text';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldText',
  component: FieldText,
  args: {
    title: 'Label',
    value: 'Value',
    placeholder: 'Placeholder',
    onChangeText: fn(),
  },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Types: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByDisplayValue('Value'), '!');
    await expect(args.onChangeText).toHaveBeenCalled();
  },
};
