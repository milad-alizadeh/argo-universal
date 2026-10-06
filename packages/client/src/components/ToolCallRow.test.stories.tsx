import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { completedRead, readMocks } from '../../mocks/tool-call-mock';
import { ToolCallRow } from './ToolCallRow';

const meta = {
  title: 'Tests/ToolCallRow',
  component: ToolCallRow,
  args: { row: completedRead },
} satisfies Meta<typeof ToolCallRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ReadFile: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
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
    }
  },
};

export const ReadFileDark: Story = { ...ReadFile, globals: { mode: 'dark' } };

export const AgentParity: Story = {
  render: () => (
    <>
      {readMocks.map(({ agent, row }) => (
        <ToolCallRow key={agent} row={row} />
      ))}
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      for (const [label, output] of [
        ['Read /project/hello.txt', /hello world/],
        ['Read /repo/app.txt', /alpha\nbeta/],
      ] as const) {
        const row = canvas.getByRole('button', { name: label });
        await userEvent.click(row);
        await expect(
          canvas.getByText(output, { normalizer: (value) => value }),
        ).toBeVisible();
        await userEvent.click(row);
      }
    }
  },
};
export const AgentParityDark: Story = {
  ...AgentParity,
  globals: { mode: 'dark' },
};
