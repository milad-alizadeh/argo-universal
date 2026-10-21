import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PlaceholderDetailView } from './placeholder-detail-view';
import {
  accountsPlaceholder,
  devicesPlaceholder,
  notificationsPlaceholder,
} from './placeholder-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Placeholder',
  component: PlaceholderDetailView,
  parameters: { screenPreview: true },
  argTypes: {
    title: { control: 'text' },
    caption: { control: 'text' },
    description: { control: 'text' },
  },
  args: accountsPlaceholder,
} satisfies Meta<typeof PlaceholderDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * The page branches only on the size class: a wide window keeps the note in a row's card, a
 * phone centres it. Each Settings page that is not built yet keeps its own story, as before.
 */
export const Accounts: Story = { args: accountsPlaceholder };

// No caption: the page's heading stands alone.
export const Devices: Story = { args: devicesPlaceholder };

export const Notifications: Story = { args: notificationsPlaceholder };
