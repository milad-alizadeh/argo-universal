import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NewSessionScreen } from './PlaceholderScreens';

const meta = {
  title: 'Screens/NewSessionScreen',
  component: NewSessionScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof NewSessionScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'NewSessionScreen' };
