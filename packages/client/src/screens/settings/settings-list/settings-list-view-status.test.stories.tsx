import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { SettingsListView } from './settings-list-view';

const onSelect = fn();

const meta = {
  title: 'Tests/SettingsListView status',
  component: SettingsListView,
  args: {
    projectCount: 1,
    agentCount: 0,
    accountState: 'GitHub',
    onSelect,
  },
  render: (args): React.JSX.Element => (
    <View className="h-175 w-full">
      <SettingsListView {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onSelect.mockClear();
  },
} satisfies Meta<typeof SettingsListView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Unavailable = 'loading' | 'disconnected';

const serverPages = (width: number): string[] => [
  'Projects',
  'Agents',
  'Accounts',
  ...(width === layoutWidths.wide ? ['Devices'] : []),
];

const connectionNames: Record<Unavailable, string> = {
  loading: 'Connection, Connecting…, connecting',
  disconnected: 'Connection, Disconnected, server unavailable',
};

function unavailable(status: Unavailable, width: number): Story {
  return {
    args: { status },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);

      for (const title of serverPages(width)) {
        const row = canvas.getByRole('link', {
          name: new RegExp(`^${title}(?:,|$)`),
        });

        await expect(row).toHaveAttribute('aria-disabled', 'true');
        await expect(row).not.toHaveAccessibleName(
          /, (?:connecting|server unavailable)$/,
        );
      }

      await expect(onSelect).not.toHaveBeenCalled();
      await userEvent.tab();

      const connection = canvas.getByRole('link', {
        name: connectionNames[status],
      });

      await expect(connection).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(onSelect).toHaveBeenLastCalledWith('/settings/connection');
      await userEvent.click(
        canvas.getByRole('link', { name: 'Appearance, System' }),
      );
      await expect(onSelect).toHaveBeenLastCalledWith('/settings/appearance');
      await expect(canvas.queryByText(/Loading Server/)).toBeNull();
      await expect(canvas.queryByText(/reconnect/)).toBeNull();
    },
  };
}

export const LoadingPhone = unavailable('loading', layoutWidths.phone);

export const LoadingWide = unavailable('loading', layoutWidths.wide);

export const DisconnectedPhone = unavailable(
  'disconnected',
  layoutWidths.phone,
);

export const DisconnectedWide = unavailable('disconnected', layoutWidths.wide);

// Counts the Server has not sent yet never read as 0.
export const CountsBeforeTheServerAnswers: Story = {
  args: { status: 'ready', projectCount: undefined, agentCount: undefined },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);

    for (const title of ['Projects', 'Agents'])
      await expect(
        canvas.getByRole('link', { name: `${title}, …` }),
      ).toBeVisible();
  },
};

export const DisconnectedBeforeTheServerAnswers: Story = {
  args: {
    status: 'disconnected',
    projectCount: undefined,
    agentCount: undefined,
  },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);

    for (const title of ['Projects', 'Agents'])
      await expect(
        canvas.getByRole('link', { name: title }),
      ).toBeInTheDocument();
  },
};

export const DisconnectedKeepsLastCounts: Story = {
  args: { status: 'disconnected' },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);
    await expect(
      canvas.getByRole('link', { name: 'Projects, 1' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: 'Agents, 0' }),
    ).toBeInTheDocument();
  },
};
