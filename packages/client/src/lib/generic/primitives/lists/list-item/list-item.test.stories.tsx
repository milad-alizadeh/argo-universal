import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { ListItem } from './list-item';

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
