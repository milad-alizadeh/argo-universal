import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { SettingsList } from './SettingsList';

const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SettingsList',
  component: SettingsList,
  args: {
    projects: [{ name: 'example-project' }],
    agents: [{ agent: 'example-agent', label: 'Example Agent' }],
    serverName: "Milad's Mac mini",
    accountState: 'GitHub',
    deviceCount: 2,
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
      for (const group of [
        "Server · Milad's Mac mini",
        width === 390 ? 'This iPhone' : 'This Mac',
      ]) {
        await expect(
          await canvas.findByRole('heading', { name: group }),
        ).toBeVisible();
      }
      for (const name of [
        'Projects',
        'Agents',
        'Accounts',
        'Connection',
        'Appearance',
      ]) {
        await userEvent.click(canvas.getByRole('button', { name }));
      }
      await expect(recorder.destinations).toEqual([
        { to: 'settings-projects' },
        { to: 'settings-agents' },
        { to: 'settings-accounts' },
        { to: 'settings-connection' },
        { to: 'settings-appearance' },
      ]);
      const projects = canvas.getByRole('button', { name: 'Projects' });
      await expect(projects.getBoundingClientRect().height).toBe(
        width === 390 ? 44 : 32,
      );
      const label = canvas.getByText('Projects', { exact: true });
      await expect(getComputedStyle(label).fontSize).toBe(
        width === 390 ? '16px' : '14px',
      );
      await expect(getComputedStyle(label).lineHeight).toBe(
        width === 390 ? '24px' : '20px',
      );
      if (width === 390) {
        await expect(
          canvas.queryByRole('button', { name: 'Devices' }),
        ).toBeNull();
        await expect(
          canvas.queryByRole('button', { name: 'Notifications' }),
        ).toBeNull();
      } else {
        await userEvent.click(canvas.getByRole('button', { name: 'Devices' }));
        await userEvent.click(
          canvas.getByRole('button', { name: 'Notifications' }),
        );
        await expect(recorder.destinations.slice(-2)).toEqual([
          { to: 'settings-devices' },
          { to: 'settings-notifications' },
        ]);
      }
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
        canvas.getByRole('button', { name: 'Projects' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Agents' }),
      ).toBeVisible();
      await expect(canvas.getAllByText('0', { exact: true })).toHaveLength(2);
      await expect(canvas.queryByText('Projects will appear here.')).toBeNull();
      await expect(
        canvas.queryByText('Registered Agents will appear here.'),
      ).toBeNull();
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

export const ChildSelectionAndAttention: Story = {
  args: {
    selectedDestination: { to: 'settings-project', name: 'example-project' },
    projectsNeedAttention: true,
    agentsNeedAttention: true,
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await waitFor(() =>
        expect(
          canvas.getByRole('button', { name: 'Projects' }),
        ).toHaveAttribute('aria-selected', width === 390 ? 'false' : 'true'),
      );
      for (const kind of ['projects', 'agents']) {
        const dot = canvas.getByTestId(`settings-${kind}-attention`);
        await expect(dot).toBeVisible();
        await expect(dot.getBoundingClientRect().width).toBe(6);
        await expect(dot.getBoundingClientRect().height).toBe(6);
      }
      await expect(canvas.queryByText('1', { exact: true })).toBeNull();
    }
  },
};

export const ChildSelectionAndAttentionDark: Story = {
  ...ChildSelectionAndAttention,
  globals: { mode: 'dark' },
};
