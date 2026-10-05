import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AccountsScreen } from './PlaceholderScreens';

const meta = {
  title: 'Screens/AccountsScreen',
  component: AccountsScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AccountsScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'AccountsScreen' };
