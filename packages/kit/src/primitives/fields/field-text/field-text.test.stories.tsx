import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor } from 'storybook/test';
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
  title: 'Tests/Design System/Primitives/Forms/FieldText',
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

export const MultilineKeepsLineBreaks: Story = {
  args: { multiline: true, value: 'one' },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByDisplayValue('one'), '{Enter}two');
    await expect(args.onChangeText).toHaveBeenCalledWith(
      expect.stringContaining('\n'),
    );
  },
};

// `autoFocus` focuses the input as the row appears and `selectTextOnFocus` selects all of its text.
export const FocusesAndSelectsOnMount: Story = {
  args: { autoFocus: true, selectTextOnFocus: true },
  play: async ({ canvas }) => {
    const field = canvas.getByDisplayValue('Value');

    await waitFor(() => expect(field).toHaveFocus());

    if (!(field instanceof HTMLInputElement))
      throw new Error('The field is not a text input.');

    await expect(field.selectionStart).toBe(0);
    await expect(field.selectionEnd).toBe('Value'.length);
  },
};

export const FocusesNothingByDefault: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue('Value')).not.toHaveFocus();
  },
};
