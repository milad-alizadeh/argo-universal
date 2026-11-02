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
import {
  marked,
  markedStatus,
  markedWarning,
  supportingValue,
  mutedTitle,
  dangerSubtitle,
  dimmedMark,
  plainMark,
} from './field-link-fixtures';

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

// An action that ends something, as a Server page's Unpair: red text at the size of the rows beside it, with no fill or border.
export const Destructive: Story = {
  args: { title: 'Unpair', action: true, destructive: true },
};

// A labelled leading mark with no status.
export const Marked: Story = { args: marked };

// A status indicator accompanies an active mark.
export const MarkedStatus: Story = { args: markedStatus };

// The supporting line and trailing value can coexist.
export const SupportingValue: Story = { args: supportingValue };

// A muted title indicates a quieter row.
export const MutedTitle: Story = { args: mutedTitle };

// A supporting line can signal an error.
export const DangerSubtitle: Story = { args: dangerSubtitle };

// A leading mark can be dimmed.
export const DimmedMark: Story = { args: dimmedMark };

// A warning indicator marks a row waiting for input.
export const MarkedWarning: Story = { args: markedWarning };

// A plain outcome glyph has no tinted background.
export const PlainMark: Story = { args: plainMark };
