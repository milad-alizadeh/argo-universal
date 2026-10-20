import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, userEvent } from 'storybook/test';
import { AppearanceDetailView } from './appearance-detail-view';

const meta = {
  title: 'Tests/Screens/Settings/Appearance',
  component: AppearanceDetailView,
  args: { theme: 'system', systemSource: 'macOS', onThemeChange: fn() },
  parameters: { screenPreview: true },
} satisfies Meta<typeof AppearanceDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsTheChosenThemeAndWhatSystemFollows: Story = {
  args: { theme: 'dark' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Theme, Dark' }),
    ).toBeVisible();
    await expect(canvas.getByText('System follows macOS.')).toBeVisible();
    await expect(canvas.queryByText(/On this/)).toBeNull();
  },
};

export const ChoosingAThemeReportsIt: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Theme, System' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Light' }),
    );
    await expect(args.onThemeChange).toHaveBeenCalledWith('light');
  },
};
