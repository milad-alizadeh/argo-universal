import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ComposerWorkChips } from './composer-status';
import { runningWork, settledWork } from './composer-status-fixtures';

const meta = {
  title: 'Composer/ComposerStatus',
  component: ComposerWorkChips,
  // The chips are a fragment; the Composer's tray lays them out in a row.
  decorators: [
    (Story): ReactElement => (
      <View className="flex-row items-center gap-2">
        <Story />
      </View>
    ),
  ],
  args: runningWork,
  argTypes: { status: { control: false }, disabled: { control: 'boolean' } },
} satisfies Meta<typeof ComposerWorkChips>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * A chip is drawn only for work the Session has, so a status with neither Subagents nor
 * Shells draws nothing and has no story.
 */

// Subagents still running: their count reads in the success tone.
export const SubagentsRunning: Story = { args: runningWork };

// Nothing running: both counts read muted.
export const Settled: Story = { args: settledWork };
