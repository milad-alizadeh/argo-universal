import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { toolCallGroupMock } from '../../mocks/tool-call-mock';
import { ExploredRow } from './ExploredRow';

const meta = {
  title: 'Tests/ExploredRow',
  component: ExploredRow,
  args: { exploration: toolCallGroupMock.exploration },
} satisfies Meta<typeof ExploredRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Explored: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const row = canvas.getByRole('button', { name: 'Explored' });
      await expect(row).toBeVisible();
      await expect(
        canvas.queryByText('Read /project/hello.txt'),
      ).not.toBeInTheDocument();
      await userEvent.click(row);
      await expect(canvas.getByText('Read /project/hello.txt')).toBeVisible();
      await userEvent.click(row);
    }
  },
};

export const ExploredDark: Story = { ...Explored, globals: { mode: 'dark' } };
