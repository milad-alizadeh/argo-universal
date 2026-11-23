import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeRow } from './change-row';
import {
  checksFailingChangeRow,
  checksOverflowChangeRow,
  checksPassedChangeRow,
  checksRunningChangeRow,
  closedChangeRow,
  draftChangeRow,
  mergedChangeRow,
  rateLimitedChangeRow,
  disconnectedChangeRow,
} from './change-row-fixtures';

// Paper 24GB-0: Components / ChangeRow, including the checks StatusDot states.
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
  argTypes: {
    change: { control: false },
    onOpen: { control: false },
    onCopyLink: { control: false },
    onDetach: { control: false },
  },
  args: {
    ...checksRunningChangeRow,
    onOpen: fn(),
    onCopyLink: fn(),
    onDetach: fn(),
  },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// The glyph, the number and the title, then a meta line of the diff total and the Change's checks.
export const ChecksRunning: Story = { args: checksRunningChangeRow };

export const ChecksFailing: Story = { args: checksFailingChangeRow };

export const ChecksPassed: Story = { args: checksPassedChangeRow };

// GitHub's rate limit refused the latest read: a dash holds the checks' place, and a pointer over it says why.
export const RateLimited: Story = {
  args: rateLimitedChangeRow,
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(
      canvas.getByRole('button', { name: /GitHub rate limit reached/ }),
    );
  },
};

// No diff total and no checks: ChangeRow's own meta line carries the modifier alone.
export const Draft: Story = { args: draftChangeRow };

// The stage each of these draws comes from ChangeStage's own fixture, never spelled out here.
export const Merged: Story = { args: mergedChangeRow };

export const Closed: Story = { args: closedChangeRow };

// The … opens a menu: Open on GitHub and Copy link, then Detach from Session.
export const MenuOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Actions for Change #/ }),
    );
  },
};

export const ChecksOverflow: Story = {
  args: checksOverflowChangeRow,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /CI Checks 24\/24/ }),
    );
  },
};

export const GitHubSignInRequired: Story = {
  args: disconnectedChangeRow,
};
