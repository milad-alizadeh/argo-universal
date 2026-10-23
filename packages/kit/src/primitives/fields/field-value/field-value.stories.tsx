import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldValue } from './field-value';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Forms/FieldValue',
  component: FieldValue,
  args: { title: 'Version', value: '1.2.3' },
  argTypes: kitArgTypes('FieldGroup.Value'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldValue>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
