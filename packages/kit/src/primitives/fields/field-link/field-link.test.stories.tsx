import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldLink } from './field-link';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldLink',
  component: FieldLink,
  args: { title: 'Licences', onPress: fn() },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Presses: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByText('Licences'));
    await expect(args.onPress).toHaveBeenCalledTimes(1);
  },
};
