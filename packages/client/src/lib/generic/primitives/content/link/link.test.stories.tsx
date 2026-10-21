import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { router } from 'expo-router';
import { expect, spyOn } from 'storybook/test';
import { Link } from './index';

const meta = {
  title: 'Tests/Link',
  component: Link,
  args: { label: 'Read more', href: 'https://example.com' },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Url: Story = {
  play: async ({ canvas, userEvent }) => {
    const link = canvas.getByRole('link', { name: 'Read more' });

    await expect(link).toHaveAttribute('href', 'https://example.com');
    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};

export const Unsupported: Story = {
  args: { href: 'javascript:alert(1)' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Read more')).toBeVisible();
    await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
  },
};

export const Route: Story = {
  args: { href: undefined, route: '/settings' },
  play: async ({ canvas, userEvent }) => {
    const navigate = spyOn(router, 'navigate').mockImplementation(() => {});

    try {
      await userEvent.click(canvas.getByRole('link', { name: 'Read more' }));
      await expect(navigate).toHaveBeenCalledWith('/settings');
    } finally {
      navigate.mockRestore();
    }
  },
};

function unsupportedRoute(route: string): Story {
  return {
    args: { href: undefined, route },
    play: async ({ canvas }) => {
      await expect(canvas.getByText('Read more')).toBeVisible();
      await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
    },
  };
}

export const ProtocolRelativeRoute = unsupportedRoute('//example.com');

export const BackslashRoute = unsupportedRoute('/\\example.com');
