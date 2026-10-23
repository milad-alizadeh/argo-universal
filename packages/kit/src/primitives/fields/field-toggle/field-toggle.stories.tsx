import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldToggle } from './field-toggle';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Fields/FieldToggle',
  component: FieldToggle,
  args: { title: 'Label', value: true, onValueChange: fn() },
  argTypes: kitArgTypes('FieldGroup.Toggle'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const On: Story = {};

export const Disabled: Story = { args: { disabled: true } };
