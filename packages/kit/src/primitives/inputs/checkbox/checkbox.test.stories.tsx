import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { Checkbox } from './checkbox';

const label = 'Notify team';

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/Checkbox',
  component: Checkbox,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  args: { label, value: false, onValueChange: fn() },
  render: function Example(props): React.JSX.Element {
    const [value, setValue] = useState(props.value);

    return (
      <Checkbox
        {...props}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          props.onValueChange(next);
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
      await expect(args.onValueChange).toHaveBeenCalledWith(true);
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
    await expect(args.onValueChange).toHaveBeenCalledWith(false);
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args }) => {
    const checkbox = canvas.getByRole('checkbox', { name: label });
    checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};

export const MarksInvalid: Story = {
  args: { invalid: true },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole('checkbox', { name: label });
    await expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  },
};
