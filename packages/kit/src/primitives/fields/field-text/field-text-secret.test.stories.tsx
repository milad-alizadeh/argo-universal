import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import { expect, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldText/Secret',
  args: { onChangeText: fn(), disabled: false, error: undefined },
  render: (args): React.JSX.Element => (
    <FieldGroup>
      <FieldGroup.Section footer={args.error}>
        <FieldGroup.SecretField
          title="Token"
          value="private-token"
          multiline
          disabled={args.disabled}
          error={args.error}
          onChangeText={args.onChangeText}
        />
      </FieldGroup.Section>
    </FieldGroup>
  ),
} satisfies Meta<
  Pick<
    ComponentProps<typeof FieldGroup.SecretField>,
    'onChangeText' | 'disabled' | 'error'
  >
>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MasksEvenWhenMultilineWasRequested: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Token');
    await expect(field).toHaveAttribute('type', 'password');
    await expect(field).toHaveAttribute('autocorrect', 'off');
    await expect(field).toHaveAttribute('spellcheck', 'false');
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent, args }) => {
    const field = canvas.getByLabelText('Token');
    await userEvent.type(field, 'replacement');
    await expect(field).toHaveAttribute('aria-disabled', 'true');
    await expect(field).toHaveValue('private-token');
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};

export const Invalid: Story = {
  args: { error: 'Invalid token' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Invalid token')).toBeVisible();
    await expect(canvas.getByLabelText('Token')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getByLabelText('Token')).toHaveAttribute(
      'type',
      'password',
    );
  },
};
