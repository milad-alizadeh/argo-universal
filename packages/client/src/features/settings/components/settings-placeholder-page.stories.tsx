import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { serverCaption } from './settings-pages.mocks';
import { SettingsPlaceholderPage } from './settings-placeholder-page';

const meta = {
  title: 'Screens/Settings/Placeholder',
  component: SettingsPlaceholderPage,
  parameters: { screenPreview: true },
} satisfies Meta<typeof SettingsPlaceholderPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Accounts: Story = {
  args: {
    title: 'Accounts',
    caption: 'What this App is talking to',
    description: 'Accounts will appear here.',
  },
};
export const Devices: Story = {
  args: {
    title: 'Devices',
    caption: serverCaption,
    description: 'Devices will appear here.',
  },
};
export const Appearance: Story = {
  args: {
    title: 'Appearance',
    description: 'Appearance will appear here.',
  },
};
export const Notifications: Story = {
  args: {
    title: 'Notifications',
    description: 'Notifications will appear here.',
  },
};
