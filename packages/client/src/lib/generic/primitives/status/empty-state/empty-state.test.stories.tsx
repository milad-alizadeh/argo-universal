import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { EmptyState } from './empty-state';

const onPress = fn();

const content = {
  icon: 'sessions',
  title: 'Title',
  description: 'Description',
  action: <Button label="Action" onPress={onPress} />,
};

const meta = {
  title: 'Tests/EmptyState',
  component: EmptyState,
  args: content,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentAndAction: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Action' }));
    await expect(onPress).toHaveBeenCalledOnce();
  },
};

export const NoAction: Story = {
  args: { action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const TitleOnly: Story = {
  args: { icon: undefined, description: undefined, action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.queryByText(content.description)).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const Search: Story = {
  args: { icon: 'search', action: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: content.title }),
    ).toBeVisible();
    await expect(canvas.getByText(content.description)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
