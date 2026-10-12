import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { serverCaption } from './settings-pages.mocks';
import { SettingsPlaceholderPage } from './settings-placeholder-page';

const description = 'Accounts will appear here.';

const meta = {
  title: 'Tests/Screens/Settings/Placeholder',
  component: SettingsPlaceholderPage,
  parameters: { screenPreview: true },
  args: {
    title: 'Accounts',
    caption: serverCaption,
    description,
  },
} satisfies Meta<typeof SettingsPlaceholderPage>;
export default meta;
type Story = StoryObj<typeof meta>;

// A wide window draws the page's own title and caption; a phone's native header names it instead.
export const TitlesTheWidePageOnly: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      canvas.getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();
    await expect(canvas.getByText(serverCaption)).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: description }),
    ).toBeVisible();
    await settleViewport(layoutWidths.phone);
    await expect(
      canvas.queryByRole('heading', { name: 'Accounts' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText(description)).toBeVisible();
  },
};
