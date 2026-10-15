import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { settleViewport } from '../../lib/generic/settle-viewport';
import { IssuesScreen } from './issues-screen';

const meta = {
  title: 'Tests/IssuesScreen',
  component: IssuesScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof IssuesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Issues: Story = {
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(canvas.getByText('Issues will appear here.')).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Back to Settings' }),
      ).not.toBeInTheDocument();
    }
  },
};

export const IssuesDark: Story = { ...Issues, globals: { mode: 'dark' } };
