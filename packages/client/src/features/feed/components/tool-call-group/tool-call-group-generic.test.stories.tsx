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

// Execute calls without terminal blocks still expose their content while running.
export const LiveExecuteText: Story = {
  args: { group: genericGroup('execute-text') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Inspect the build/ }),
    );
    await expect(canvas.getByText('Build output in progress')).toBeVisible();
    await expect(canvas.getAllByText('Inspect the build')).toHaveLength(1);
  },
};

// Edit calls without diff blocks still expose raw input and output while running.
export const LiveEditRaw: Story = {
  args: { group: genericGroup('edit-raw') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Update configuration/ }),
    );
    await expect(canvas.getByText(/config.json/)).toBeVisible();
    await expect(canvas.getByText(/Changes pending/)).toBeVisible();
    await expect(canvas.getAllByText('Update configuration')).toHaveLength(1);
  },
};

export const LiveDeleteRaw: Story = {
  args: { group: genericGroup('delete-raw') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Remove cache/ }),
    );
    await expect(canvas.getByText(/Removal pending/)).toBeVisible();
    await expect(canvas.getAllByText('Remove cache')).toHaveLength(1);
  },
};

export const LiveMoveRaw: Story = {
  args: { group: genericGroup('move-raw') },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      canvas.getByRole('button', { name: /^Move archive/ }),
    );
    await expect(canvas.getByText(/Move pending/)).toBeVisible();
    await expect(canvas.getAllByText('Move archive')).toHaveLength(1);
  },
};
