import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { composerLongSettingsOptions } from '../../mocks/composer-settings-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { ComposerOptions } from './composer-options';

const meta = {
  title: 'Tests/ComposerOptions',
  component: ComposerOptions,
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => (
    <View className="flex-1 justify-end items-start p-4">
      <ComposerOptions {...args} />
    </View>
  ),
} satisfies Meta<typeof ComposerOptions>;
export default meta;
type Story = StoryObj<typeof meta>;

function longSettings(width: number, agentIndex: number): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded settings need two Agents.');
  const onConfigChange = fn();
  return {
    args: {
      disabled: false,
      configuration: {
        agents: [agent],
        agent: agent.agent,
        configOptions: composerLongSettingsOptions,
        onConfigChange,
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    beforeEach: () => onConfigChange.mockClear(),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Session settings' }),
      );
      const overlay = within(document.body);
      const scroll = await overlay.findByTestId('composer-settings-scroll');
      await waitFor(() =>
        expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
      );
      scroll.scrollTop = scroll.scrollHeight;
      const last = await overlay.findByRole('button', {
        name: 'Profile: Profile 40',
      });
      await waitFor(async () => {
        scroll.scrollTop = scroll.scrollHeight;
        const item = last.getBoundingClientRect();
        const viewport = scroll.getBoundingClientRect();
        await expect(item.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(item.bottom).toBeLessThanOrEqual(viewport.bottom);
        await expect(item.bottom).toBeLessThanOrEqual(window.innerHeight);
      });
      await userEvent.click(last);
      await expect(onConfigChange).toHaveBeenCalledOnce();
      await expect(onConfigChange).toHaveBeenCalledWith(
        'profile',
        'profile-40',
      );
    },
  };
}
export const LongSettingsPhoneFirstAgent = longSettings(layoutWidths.phone, 0);
export const LongSettingsPhoneSecondAgent = longSettings(layoutWidths.phone, 1);
export const LongSettingsWideFirstAgent = longSettings(layoutWidths.wide, 0);
export const LongSettingsWideSecondAgent = longSettings(layoutWidths.wide, 1);
