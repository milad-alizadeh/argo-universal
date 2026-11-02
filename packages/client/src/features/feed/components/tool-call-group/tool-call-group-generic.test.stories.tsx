import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { ToolCallRow } from '../tool-call-row/tool-call-row';
import { ToolCallGroup } from './tool-call-group';
import { genericGroup } from './tool-call-group-generic.mocks';

const meta = {
  title: 'Tests/Feed/ToolCallGroup/Generic',
  component: ToolCallGroup,
  args: {
    group: genericGroup('mcp-content'),
    renderActivity: (activity): React.JSX.Element | null =>
      activity.type === 'tool_call' ? <ToolCallRow row={activity.row} /> : null,
  },
} satisfies Meta<typeof ToolCallGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LiveContent: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Read the issue/ }),
    );
    await expect(canvas.getByText('Issue details from MCP')).toBeVisible();
    await expect(canvas.getAllByText('Read the issue')).toHaveLength(1);
  },
};

export const LiveRawDetails: Story = {
  args: { group: genericGroup('mcp-raw') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Look up the issue/ }),
    );
    await expect(canvas.getByText(/1918/)).toBeVisible();
    await expect(canvas.getByText(/Live detail/)).toBeVisible();
    await expect(canvas.getAllByText('Look up the issue')).toHaveLength(1);
  },
};
