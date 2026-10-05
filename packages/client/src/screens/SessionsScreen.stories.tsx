import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { sessionListMocks } from '../../mocks/session-list-mock';
import { SessionsScreenPreview } from '../../mocks/sessions-screen-preview';
import { SessionsScreen } from './SessionsScreen';

const meta = {
  title: 'Screens/SessionsScreen',
  component: SessionsScreen,
  parameters: { trpc: sessionListMocks, screenPreview: true },
  args: { query: '', archived: false },
  render: () => <SessionsScreenPreview />,
} satisfies Meta<typeof SessionsScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionsScreen' };
