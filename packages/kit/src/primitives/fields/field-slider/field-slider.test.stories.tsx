import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSlider } from './field-slider';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldSlider',
  component: FieldSlider,
  args: {
    title: 'Label',
    value: 50,
    min: 0,
    max: 100,
    step: 10,
    onValueChange: fn(),
  },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsTitle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Label')).toBeVisible();
  },
};
