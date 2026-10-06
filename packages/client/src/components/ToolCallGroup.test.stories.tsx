import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
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
        name: 'Show hello.txt and short git status',
      });
      await expect(group).toBeVisible();
      await expect(
        canvas.queryAllByRole('button', { name: /^Read / }),
      ).toHaveLength(0);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(
        canvas.getAllByRole('button', {
          name: 'Show hello.txt and short git status',
        }),
      ).toHaveLength(2);
      await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
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
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expectShimmerMovement(group);
      await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
      await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
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
      const groups = [
        canvas.getByRole('button', {
          name: 'Show hello.txt and short git status',
        }),
        canvas.getByRole('button', { name: 'Ran command' }),
      ];
      for (const group of groups) await userEvent.click(group);
      await expect(
        canvas.getByRole('button', { name: 'Read /project/hello.txt' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Read /repo/app.txt' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Explored')).not.toBeInTheDocument();
      for (const group of groups) await userEvent.click(group);
      await waitFor(() =>
        expect(
          canvas.queryAllByRole('button', { name: /^Read / }),
        ).toHaveLength(0),
      );
    }
  },
};

export const SettledDark: Story = { ...Settled, globals: { mode: 'dark' } };
export const RunningDark: Story = { ...Running, globals: { mode: 'dark' } };
export const AgentParityDark: Story = {
  ...AgentParity,
  globals: { mode: 'dark' },
};
