import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeRow } from './change-row';
import {
  checksFailingChangeRow,
  checksPassedChangeRow,
  checksRunningChangeRow,
  closedChangeRow,
  draftChangeRow,
  mergedChangeRow,
} from './change-row-fixtures';

// Paper 24GB-0: Components / ChangeRow, including the checks donut states.
const meta = {
  title: 'Sessions/ChangeRow',
  component: ChangeRow,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <View className="w-frame-list">
          <Story />
        </View>
      </View>
    ),
  ],
  argTypes: { change: { control: false }, onOpen: { control: false } },
  args: { ...checksRunningChangeRow, onOpen: fn() },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// The glyph, the number and the title, then a meta line of the diff total and the Change's checks.
export const ChecksRunning: Story = { args: checksRunningChangeRow };

export const ChecksFailing: Story = { args: checksFailingChangeRow };

export const ChecksPassed: Story = { args: checksPassedChangeRow };

// No diff total and no checks: ChangeRow's own meta line carries the modifier alone.
export const Draft: Story = { args: draftChangeRow };

// The stage each of these draws comes from ChangeStage's own fixture, never spelled out here.
export const Merged: Story = { args: mergedChangeRow };

export const Closed: Story = { args: closedChangeRow };
