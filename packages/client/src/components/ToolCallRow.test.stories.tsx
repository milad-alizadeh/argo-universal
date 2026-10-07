import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { completedRead, readMocks } from '../../mocks/tool-call-mock';
import { ToolCallRow } from './ToolCallRow';

const meta = {
  title: 'Tests/ToolCallRow',
  component: ToolCallRow,
  args: { row: completedRead },
} satisfies Meta<typeof ToolCallRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function readFile(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const row = canvas.getByRole('button', {
        name: 'Read /project/hello.txt',
      });
      await expect(row).toBeVisible();
      await expect(canvas.queryByText('Explored')).not.toBeInTheDocument();
      await expect(
        canvas.queryByText('hello.txt', { exact: true }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByText(/hello world/)).not.toBeInTheDocument();
      await userEvent.click(row);
      await expect(canvas.getByText(/hello world/)).toBeVisible();
      await expect(
        canvas.getByText('hello.txt', { exact: true }),
      ).toBeVisible();
      await userEvent.click(row);
      await waitFor(() =>
        expect(canvas.queryByText(/hello world/)).not.toBeInTheDocument(),
      );
    },
  };
}
export const ReadFilePhone = readFile(layoutWidths.phone);
export const ReadFileWide = readFile(layoutWidths.wide);

function agentParity(width: number): Story {
  return {
    render: () => (
      <>
        {readMocks.map(({ agent, row }) => (
          <ToolCallRow key={agent} row={row} />
        ))}
      </>
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      for (const [label, output] of [
        ['Read /project/hello.txt', /hello world/],
        ['Read /repo/app.txt', /alpha\nbeta/],
      ] as const) {
        const row = canvas.getByRole('button', { name: label });
        await expect(
          canvas.queryByText(output, { normalizer: (value) => value }),
        ).not.toBeInTheDocument();
        await userEvent.click(row);
        await expect(
          canvas.getByText(output, { normalizer: (value) => value }),
        ).toBeVisible();
        await userEvent.click(row);
      }
    },
  };
}
export const AgentParityPhone = agentParity(layoutWidths.phone);
export const AgentParityWide = agentParity(layoutWidths.wide);

const dark = { globals: { mode: 'dark' } };
export const ReadFilePhoneDark: Story = { ...ReadFilePhone, ...dark };
export const ReadFileWideDark: Story = { ...ReadFileWide, ...dark };
export const AgentParityPhoneDark: Story = { ...AgentParityPhone, ...dark };
export const AgentParityWideDark: Story = { ...AgentParityWide, ...dark };
