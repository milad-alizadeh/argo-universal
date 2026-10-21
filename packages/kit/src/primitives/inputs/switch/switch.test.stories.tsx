import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { Switch } from './switch';

const accessibilityLabel = 'Notify team';

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/Switch',
  component: Switch,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  args: { accessibilityLabel, value: false, onValueChange: fn() },
  render: function Example(props): React.JSX.Element {
    const [value, setValue] = useState(props.value);

    return (
      <Switch
        {...props}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          props.onValueChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TurnsOn: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const control = canvas.getByRole('switch', { name: accessibilityLabel });
    await userEvent.click(control);
    await expect(args.onValueChange).toHaveBeenCalledWith(true);
    await expect(control).toBeChecked();
  },
};

// The ARIA switch pattern: Space toggles a focused switch.
export const TurnsOnWithSpace: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const control = canvas.getByRole('switch', { name: accessibilityLabel });
    control.focus();
    await userEvent.keyboard(' ');
    await expect(args.onValueChange).toHaveBeenCalledTimes(1);
    await expect(control).toBeChecked();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args }) => {
    const control = canvas.getByRole('switch', { name: accessibilityLabel });
    control.click();
    await expect(control).not.toBeChecked();
    await expect(control).toHaveAttribute('aria-disabled', 'true');
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
