import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldLink } from './field-link';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Forms/FieldLink',
  component: FieldLink,
  args: { title: 'Licences', onPress: fn() },
  argTypes: kitArgTypes('FieldGroup.Link'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Counting what the page it opens holds, as Settings' Projects row does.
export const Counted: Story = {
  args: { title: 'Projects', leading: 'folder', value: '3' },
};

// A row that performs an action, as the Attach Sheet's choices do: no chevron, and a button to assistive technology.
export const Action: Story = {
  args: { title: 'Photos', leading: 'photos', action: true },
};

// A row that does nothing, as the Attach Sheet's Slash Commands when the Agent has none.
export const Disabled: Story = {
  args: {
    title: 'Slash Commands',
    leading: 'code',
    action: true,
    disabled: true,
  },
};
