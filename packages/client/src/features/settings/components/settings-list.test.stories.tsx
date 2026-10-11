import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { createNavigationRecorder } from '../../../../mocks/with-navigation-mocks';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { SettingsList } from './settings-list';

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
  render: (args): React.JSX.Element => (
    <View className="h-[700px] w-full">
      <SettingsList {...args} />
    </View>
  ),
  parameters: { navigation: recorder },
  beforeEach: (): void => recorder.reset(),
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

function allGroupsNavigate(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(recorder.destinations).toEqual([]);
      for (const group of [
        "Server · Milad's Mac mini",
        width === layoutWidths.phone ? 'This iPhone' : 'This Mac',
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
        const row = canvas.getByRole('link', {
          name: new RegExp(`^${name}(?:,|$)`),
        });
        await (name === 'Connection'
          ? expect(row).toHaveAccessibleName(/, available$/)
          : expect(row).not.toHaveAccessibleName(/, available$/));
        await expect(row).toHaveAttribute(
          'href',
          `/settings/${name.toLowerCase()}`,
        );
        await userEvent.click(row);
      }
      await expect(recorder.destinations).toEqual([
        { to: 'settings-projects' },
        { to: 'settings-agents' },
        { to: 'settings-accounts' },
        { to: 'settings-connection' },
        { to: 'settings-appearance' },
      ]);
      if (width === layoutWidths.phone) {
        await expect(
          canvas.queryByRole('link', { name: /^Devices(?:,|$)/ }),
        ).toBeNull();
        await expect(
          canvas.queryByRole('link', { name: /^Notifications(?:,|$)/ }),
        ).toBeNull();
      } else {
        await userEvent.click(
          canvas.getByRole('link', { name: /^Devices(?:,|$)/ }),
        );
        await userEvent.click(
          canvas.getByRole('link', { name: /^Notifications(?:,|$)/ }),
        );
        await expect(recorder.destinations.slice(-2)).toEqual([
          { to: 'settings-devices' },
          { to: 'settings-notifications' },
        ]);
      }
    },
  };
}
export const AllGroupsNavigatePhone = allGroupsNavigate(layoutWidths.phone);
export const AllGroupsNavigateWide = allGroupsNavigate(layoutWidths.wide);

export const WaitingForData: Story = {
  args: { projects: [], agents: [] },
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByRole('link', { name: /^Projects(?:,|$)/ }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('link', { name: /^Agents(?:,|$)/ }),
      ).toBeVisible();
      await expect(canvas.getAllByText('0', { exact: true })).toHaveLength(2);
      await expect(canvas.queryByText('Projects will appear here.')).toBeNull();
      await expect(
        canvas.queryByText('Registered Agents will appear here.'),
      ).toBeNull();
      await expect(
        canvas.getByRole('link', { name: /^Accounts(?:,|$)/ }),
      ).toBeVisible();
    }
  },
};

export const AllGroupsNavigatePhoneDark: Story = {
  ...AllGroupsNavigatePhone,
  globals: { mode: 'dark' },
};
export const AllGroupsNavigateWideDark: Story = {
  ...AllGroupsNavigateWide,
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
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await waitFor(() =>
        expect(
          canvas
            .getByRole('link', { name: /^Projects(?:,|$)/ })
            .getAttribute('aria-current'),
        ).toBe(width === 390 ? null : 'page'),
      );
      await expect(
        canvas.getByRole('link', { name: 'Projects, 1, needs attention' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('link', { name: 'Agents, 1, needs attention' }),
      ).toBeVisible();
    }
  },
};

export const ChildSelectionAndAttentionDark: Story = {
  ...ChildSelectionAndAttention,
  globals: { mode: 'dark' },
};
