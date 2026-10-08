import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { newSessionMocks } from '../../mocks/new-session-mock';
import { NewSessionScreen } from './new-session-screen';

const meta = {
  title: 'Screens/NewSessionScreen',
  component: NewSessionScreen,
  parameters: { trpc: newSessionMocks, screenPreview: true },
} satisfies Meta<typeof NewSessionScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'NewSessionScreen' };

export const Reconnecting: StoryObj<typeof meta> = {
  parameters: { connection: 'reconnecting' },
};
