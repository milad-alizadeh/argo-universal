import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PlaceholderDetailView } from './placeholder-detail-view';
import {
  accountsPlaceholder,
  devicesPlaceholder,
} from './placeholder-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Placeholder',
  component: PlaceholderDetailView,
  parameters: { screenPreview: true },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
} satisfies Meta<typeof PlaceholderDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * The page branches only on the size class: a wide window keeps the note in a row's card, a phone
 * centres it. A page's title and note are copy, so they are args, not stories of their own.
 */
export const Accounts: Story = { args: accountsPlaceholder };

export const Devices: Story = { args: devicesPlaceholder };
