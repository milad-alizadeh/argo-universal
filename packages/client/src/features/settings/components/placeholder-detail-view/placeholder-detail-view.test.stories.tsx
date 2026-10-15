import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { PlaceholderDetailView } from './placeholder-detail-view';

const description = 'Accounts will appear here.';

const caption = 'What this App is talking to';

const meta = {
  title: 'Tests/Screens/Settings/Placeholder',
  component: PlaceholderDetailView,
  parameters: { screenPreview: true },
  args: {
    title: 'Accounts',
    caption,
    description,
  },
} satisfies Meta<typeof PlaceholderDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// A wide window draws the page's own title and caption; on a phone only the header names it.
export const TitlesTheWidePageOnly: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      canvas.getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();
    await expect(canvas.getByText(caption)).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: description }),
    ).toBeVisible();
    await settleViewport(layoutWidths.phone);
    await expect(
      canvas.getAllByRole('heading', { name: 'Accounts' }),
    ).toHaveLength(1);
    await expect(canvas.queryByText(caption)).not.toBeInTheDocument();
    await expect(canvas.getByText(description)).toBeVisible();
  },
};
