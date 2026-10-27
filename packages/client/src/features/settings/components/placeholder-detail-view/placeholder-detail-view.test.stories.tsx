import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
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

// Screen owns where its title goes at each width; this checks the caption shows on a wide window only.
export const CaptionsTheWidePageOnly: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(
      canvas.getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();
    await expect(canvas.getByText(caption)).toBeVisible();
    await expect(canvas.getByText(description)).toBeVisible();
    await settleLayout('phone');
    await expect(canvas.queryByText(caption)).not.toBeInTheDocument();
    await expect(canvas.getByText(description)).toBeVisible();
  },
};
