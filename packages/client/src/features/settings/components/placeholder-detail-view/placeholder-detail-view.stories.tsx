import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PlaceholderDetailView } from './placeholder-detail-view';

const meta = {
  title: 'Screens/Settings/Placeholder',
  component: PlaceholderDetailView,
  parameters: { screenPreview: true },
} satisfies Meta<typeof PlaceholderDetailView>;

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
