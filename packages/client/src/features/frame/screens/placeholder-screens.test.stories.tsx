import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { AtlasScreen, IssuesScreen } from './placeholder-screens';

const meta = {
  title: 'Tests/PlaceholderScreens',
  component: IssuesScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof IssuesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

function placeholder(description: string): NonNullable<Story['play']> {
  return async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(canvas.getByText(description)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Back to Settings' }),
      ).not.toBeInTheDocument();
    }
  };
}

export const Issues: Story = {
  render: () => <IssuesScreen />,
  play: placeholder('Issues will appear here.'),
};

export const Atlas: Story = {
  render: () => <AtlasScreen />,
  play: placeholder('Atlas will appear here.'),
};

export const IssuesDark: Story = { ...Issues, globals: { mode: 'dark' } };

export const AtlasDark: Story = { ...Atlas, globals: { mode: 'dark' } };
