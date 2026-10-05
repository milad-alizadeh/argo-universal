import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PhoneListHeader } from './PhoneListHeader';

const meta = {
  title: 'Tests/PhoneListHeader',
  component: PhoneListHeader,
  args: {
    title: 'Sessions',
    onMenu: fn(),
    onSearch: fn(),
    onFilter: fn(),
  },
} satisfies Meta<typeof PhoneListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensHeaderActions: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Sessions' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open navigation' }),
    );
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Search Sessions' }),
    );
    await expect(args.onSearch).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Filter Sessions' }),
    );
    await expect(args.onFilter).toHaveBeenCalledOnce();
  },
};
