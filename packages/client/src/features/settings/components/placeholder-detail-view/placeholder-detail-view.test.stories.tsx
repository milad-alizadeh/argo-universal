import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
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

// Page owns where its title goes at each width; this checks the caption shows on a wide window only.
export const CaptionsTheWidePageOnly: Story = {
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
    await expect(canvas.queryByText(caption)).not.toBeInTheDocument();
    await expect(canvas.getByText(description)).toBeVisible();
  },
};
