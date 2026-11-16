import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeRow } from './change-row';
import {
  autoArchiveOffChangeRow,
  autoArchiveOnChangeRow,
  autoFixStoppedChangeRow,
  autoMergeOffChangeRow,
  autoMergeOnChangeRow,
  autoMergeUnavailableChangeRow,
  everyAutomationChangeRow,
} from './change-row-automation-fixtures';

// Paper WRB-0: PR automation menu, Option A. The … menu holds the automation items between the links and Detach.
const meta = {
  title: 'Sessions/ChangeRowAutomation',
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
  argTypes: {
    change: { control: false },
    onOpen: { control: false },
    onCopyLink: { control: false },
    onDetach: { control: false },
    onSetAutomation: { control: false },
  },
  args: {
    ...autoMergeOffChangeRow,
    onOpen: fn(),
    onCopyLink: fn(),
    onDetach: fn(),
    onSetAutomation: fn(),
  },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const openMenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole('button', { name: /^Actions for Change #/ }),
  );
};

// Auto-merge is on offer and unticked.
export const AutoMergeOff: Story = {
  args: autoMergeOffChangeRow,
  play: openMenu,
};

// GitHub reports auto-merge on, so the item is ticked.
export const AutoMergeOn: Story = {
  args: autoMergeOnChangeRow,
  play: openMenu,
};

// Disabled, with the reason under the label.
export const AutoMergeUnavailable: Story = {
  args: autoMergeUnavailableChangeRow,
  play: openMenu,
};

// Auto-fix gave up after three tries on one commit: unticked, enabled, with the reason under it in the warning tone.
export const AutoFixStopped: Story = {
  args: autoFixStoppedChangeRow,
  play: openMenu,
};

// Auto-archive on offer and unticked, with "On merge or close" under it.
export const AutoArchiveOff: Story = {
  args: autoArchiveOffChangeRow,
  play: openMenu,
};

// The person ticked Auto-archive, so the item is ticked.
export const AutoArchiveOn: Story = {
  args: autoArchiveOnChangeRow,
  play: openMenu,
};

// All three automations in their group, between the links and Detach.
export const EveryAutomation: Story = {
  args: everyAutomationChangeRow,
  play: openMenu,
};
