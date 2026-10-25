import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { ListItem } from './index';

const title = 'Item one';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/ListItem',
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
    row.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const SlottedAnatomy: Story = {
  args: {
    title: 'Item three',
    subtitle: 'Subtitle',
    meta: <Pill text="Meta" />,
    progress: { value: 0.4, tone: 'success', active: true },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Item three')).toBeVisible();
    await expect(canvas.getByText('Meta')).toBeVisible();
  },
};

export const StatusBadge: Story = {
  args: { badge: { kind: 'status', tone: 'warning', label: 'Warning' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Warning')).toBeVisible();
  },
};

export const CountBadge: Story = {
  args: { title: 'Disabled item', disabled: true, badge: 3 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('3')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Disabled item' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Value: Story = {
  args: { title: 'Version', value: '1.2', onPress: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Version, 1.2')).toBeVisible();
  },
};

export const Loading: Story = {
  args: { isLoading: true, subtitle: 'main' },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(title));
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};
