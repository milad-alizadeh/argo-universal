import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { Checkbox } from './checkbox';

const label = 'Notify team';

const failure = 'Choose whether to notify the team';

const meta = {
  title: 'Tests/Checkbox',
  component: Checkbox,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  args: { label, value: false, onChange: fn() },
  render: function Example(props): React.JSX.Element {
    const [value, setValue] = useState(props.value);

    return (
      <Checkbox
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

function checksWith(input: 'pointer' | 'keyboard'): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      const checkbox = canvas.getByRole('checkbox', { name: label });

      if (input === 'pointer') await userEvent.click(checkbox);
      else {
        checkbox.focus();
        await userEvent.keyboard(' ');
      }

      await expect(checkbox).toBeChecked();
      await expect(args.onChange).toHaveBeenCalledWith(true);
    },
  };
}

export const PointerChecks = checksWith('pointer');

export const SpaceChecks = checksWith('keyboard');

export const Unchecks: Story = {
  args: { value: true },
  play: async ({ canvas, userEvent, args }) => {
    const checkbox = canvas.getByRole('checkbox', { name: label });
    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith(false);
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args }) => {
    const checkbox = canvas.getByRole('checkbox', { name: label });
    checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const AnnouncesError: Story = {
  args: { errors: [failure] },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox', { name: label });
    await expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    await expect(checkbox).toHaveAccessibleDescription(failure);
    await expect(canvas.getByRole('alert')).toHaveTextContent(failure);
  },
};
