import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { SettingsList } from './settings-list';

const onSelect = fn();
const meta = {
  title: 'Tests/SettingsList status',
  component: SettingsList,
  args: {
    projects: [{ name: 'argo' }],
    agents: [],
    accountState: 'GitHub',
    onSelect,
  },
  render: (args): React.JSX.Element => (
    <View className="h-[700px] w-full">
      <SettingsList {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onSelect.mockClear();
  },
} satisfies Meta<typeof SettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;

function unavailable(status: 'loading' | 'disconnected', width: number): Story {
  return {
    args: { status },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      for (const title of [
        'Projects',
        'Agents',
        'Accounts',
        ...(width === layoutWidths.wide ? ['Devices'] : []),
      ]) {
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
        name:
          status === 'loading'
            ? 'Connection, Connecting…, connecting'
            : 'Connection, Disconnected, server unavailable',
      });
      await expect(connection).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(onSelect).toHaveBeenLastCalledWith({
        to: 'settings-connection',
      });
      await userEvent.click(
        canvas.getByRole('link', { name: 'Appearance, System' }),
      );
      await expect(onSelect).toHaveBeenLastCalledWith({
        to: 'settings-appearance',
      });
      await expect(canvas.queryByText('Loading Server settings…')).toBeNull();
      await expect(
        canvas.queryByText('Server unavailable. Open Connection to reconnect.'),
      ).toBeNull();
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
