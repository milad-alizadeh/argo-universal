import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { renderRecordedActivity } from '../../mocks/tool-call-group-preview';
import {
  toolCallGroupMock,
  toolCallGroupMocks,
} from '../../mocks/tool-call-mock';
import { ToolCallGroup } from './ToolCallGroup';

const meta = {
  title: 'Tests/ToolCallGroup',
  component: ToolCallGroup,
  args: {
    group: toolCallGroupMock.group,
    renderActivity: renderRecordedActivity,
  },
} satisfies Meta<typeof ToolCallGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Settled: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const group = canvas.getByRole('button', {
        name: 'Read files, ran commands',
      });
      await expect(group).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Explored' }),
      ).not.toBeInTheDocument();
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Explored' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', {
          name: 'Show hello.txt and short git status',
        }),
      ).toBeVisible();
      await userEvent.click(group);
    }
  },
};

export const Running: Story = {
  args: { group: toolCallGroupMock.running },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const group = canvas.getByRole('button', {
        name: 'Show hello.txt and short git status',
      });
      await expect(group).toBeVisible();
      await expect(canvas.getByRole('progressbar')).toBeVisible();
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Explored' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await userEvent.click(group);
    }
  },
};

export const AgentParity: Story = {
  render: (args) => (
    <>
      {toolCallGroupMocks.map(({ agent, group }) => (
        <ToolCallGroup {...args} key={agent} group={group} />
      ))}
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const groups = canvas.getAllByRole('button', {
        name: 'Read files, ran commands',
      });
      await expect(groups).toHaveLength(2);
      for (const group of groups) await userEvent.click(group);
      await expect(
        canvas.getAllByRole('button', { name: 'Explored' }),
      ).toHaveLength(2);
      for (const group of groups) await userEvent.click(group);
    }
  },
};

export const SettledDark: Story = { ...Settled, globals: { mode: 'dark' } };
export const RunningDark: Story = { ...Running, globals: { mode: 'dark' } };
export const AgentParityDark: Story = {
  ...AgentParity,
  globals: { mode: 'dark' },
};
