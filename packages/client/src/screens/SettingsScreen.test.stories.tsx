import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { SettingsScreen } from './SettingsScreen';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SettingsScreen',
  component: SettingsScreen,
  parameters: { navigation: recorder },
  beforeEach: () => recorder.reset(),
} satisfies Meta<typeof SettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WideOpensAccounts: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await expect(
      await canvas.findByText('Accounts will appear here.'),
    ).toBeVisible();
  },
};

export const PhoneShowsTheList: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Connection' }),
    );
    await expect(canvas.queryByText('Accounts will appear here.')).toBeNull();
    await expect(recorder.destinations).toEqual([
      { to: 'settings-connection' },
    ]);
  },
};
