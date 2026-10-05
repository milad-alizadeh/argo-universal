import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { SettingsList } from './SettingsList';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SettingsList',
  component: SettingsList,
  args: {
    projects: [{ name: 'example-project' }],
    agents: [{ agent: 'example-agent', label: 'Example Agent' }],
    onSelect: recorder.navigate,
  },
  render: (args) => (
    <View className="h-[700px] w-full">
      <SettingsList {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: () => recorder.reset(),
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllGroupsNavigate: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      recorder.reset();
      for (const group of ['Projects', 'Server', 'Agents', 'App']) {
        await expect(
          canvas.getByRole('heading', { name: group }),
        ).toBeVisible();
      }
      for (const name of [
        'example-project',
        'Accounts',
        'Connection',
        'Example Agent',
      ]) {
        await userEvent.click(canvas.getByRole('button', { name }));
      }
      await expect(recorder.destinations).toEqual([
        { to: 'settings-project', name: 'example-project' },
        { to: 'settings-accounts' },
        { to: 'settings-connection' },
        { to: 'settings-agent', agent: 'example-agent' },
      ]);
      await expect(
        canvas.getByRole('button', { name: 'Appearance' }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Notifications' }),
      ).toBeDisabled();
    }
  },
};

export const WaitingForData: Story = {
  args: { projects: [], agents: [] },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByText('Projects will appear here.'),
      ).toBeVisible();
      await expect(
        canvas.getByText('Registered Agents will appear here.'),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Accounts' }),
      ).toBeVisible();
    }
  },
};

export const AllGroupsNavigateDark: Story = {
  ...AllGroupsNavigate,
  globals: { mode: 'dark' },
};

export const WaitingForDataDark: Story = {
  ...WaitingForData,
  globals: { mode: 'dark' },
};
