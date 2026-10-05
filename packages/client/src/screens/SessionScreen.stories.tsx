import { sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SessionScreen } from './SessionScreen';

const meta = {
  title: 'Screens/SessionScreen',
  component: SessionScreen,
  parameters: { screenPreview: true },
  args: { id: sessionRows.running.sessionId },
} satisfies Meta<typeof SessionScreen>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionScreen' };
