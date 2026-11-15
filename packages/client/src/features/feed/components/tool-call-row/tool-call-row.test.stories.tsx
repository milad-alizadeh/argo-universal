import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { completedRead, readMocks } from '../tool-call.mocks';
import { ToolCallRow } from './tool-call-row';
import { commandWithoutOutput, rawToolCall } from './tool-call-row-fixtures';

const meta = {
  title: 'Tests/Feed/ToolCallRow',
  component: ToolCallRow,
  args: { row: completedRead },
} satisfies Meta<typeof ToolCallRow>;

export default meta;

type Story = StoryObj<typeof meta>;

function readFile(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);

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
      await settleLayout(width);

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

// A command with no output yet shows its command line, not its raw input (#2044).
export const CommandWithoutOutput: Story = {
  args: commandWithoutOutput,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: /^Verify the build/ }),
    );
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(canvas.getByText(/\$ pnpm verify/)).toBeVisible();
    await expect(canvas.queryByText('Input')).not.toBeInTheDocument();
    await expect(canvas.queryByText(/timeout/)).not.toBeInTheDocument();
  },
};

// An MCP call with no content blocks shows its raw input and output, each under its own caption.
export const RawInputAndOutput: Story = {
  args: rawToolCall,
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('Input')).toBeVisible();
    await expect(canvas.getByText('Output')).toBeVisible();
    const [input, output] = canvas.getAllByTestId('code-text');
    await expect(input).toHaveTextContent('"issue": 1918');
    await expect(output).toHaveTextContent('"title": "Live detail"');
    await expect(canvas.queryByText('Shell')).not.toBeInTheDocument();
  },
};
