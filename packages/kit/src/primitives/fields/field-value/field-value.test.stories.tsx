import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldValue } from './field-value';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldValue',
  component: FieldValue,
  args: { title: 'Version', value: '1.2.3' },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldValue>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsValue: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Version')).toBeVisible();
    await expect(canvas.getByText('1.2.3')).toBeVisible();
  },
};
