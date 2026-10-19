import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { ListItem } from './index';
import { Overview } from './list-item.stories';

const title = 'Deploy web';

const meta = {
  title: 'Tests/Design System/Primitives/ListItem',
  component: ListItem,
  args: { title, onPress: fn() },
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Select: Story = {
  args: { subtitle: 'main', selected: true, trailing: <Text>now</Text> },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('main')).toBeVisible();
    await expect(canvas.getByText('now')).toBeVisible();
    const row = canvas.getByRole('button', { name: title });
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(row);
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    const row = canvas.getByRole('button', { name: title });
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const SlottedAnatomy: Story = {
  render: Overview.render,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Deploy web to production'),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Needs attention')).toBeVisible();
    await expect(canvas.getByLabelText('3')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Archived Session' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Value: Story = {
  args: { title: 'Version', value: '1.2', onPress: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Version, 1.2')).toBeVisible();
  },
};

export const StepperBounds: Story = {
  render: () => (
    <ListItem.Stepper
      title="Max Sessions"
      value={1}
      min={1}
      max={2}
      onValueChange={fn()}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Decrease Max Sessions' }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: 'Increase Max Sessions' }),
    ).toBeEnabled();
  },
};
